/**
 * Cost Estimator Agent
 *
 * Receives listing data from the orchestrator and calculates:
 *  1. Move-in costs (first/last, deposit, application fee, etc.)
 *  2. Monthly costs (rent, utilities, insurance, parking, pets)
 *  3. Moving costs (movers, truck, supplies)
 *  4. Grand total with itemized breakdown
 *
 * Uses Claude Haiku for lightweight cost analysis and natural language output.
 * LA-specific utility averages are baked in.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  BaseAgent,
  getAnthropicClient,
  streamText,
  MODELS,
} from './framework';
import type {
  AgentConfig,
  CostEstimateData,
  StreamEvent,
  SubAgentContext,
} from './types';
import { createClient } from '@/lib/supabase/server';

// ─── LA Cost Constants ──────────────────────────────────────────

const LA_COSTS = {
  // Monthly utilities (LA averages)
  electricity: 150,   // LADWP average
  gas: 45,            // SoCalGas average
  water: 65,          // LADWP water/sewer average
  internet: 65,       // Spectrum/AT&T average
  rentersInsurance: 22, // Average renter's insurance

  // Move-in costs
  securityDepositMultiplier: 1.5,  // Typically 1-2x rent
  applicationFee: 50,              // $30-75 range
  brokerFeePct: 0,                 // Uncommon in LA

  // Pet costs
  petDeposit: 500,
  petRent: 50,

  // Parking
  parkingFee: 150,  // Average garage/covered spot

  // Moving costs
  movers: {
    studio: 800,
    oneBed: 1200,
    twoBed: 1800,
    threePlus: 2500,
  },
  truckRental: {
    studio: 100,
    oneBed: 150,
    twoBed: 200,
    threePlus: 300,
  },
  packingSupplies: {
    studio: 50,
    oneBed: 100,
    twoBed: 150,
    threePlus: 200,
  },
  storageCosts: 0, // Default no storage
} as const;

// ─── Configuration ──────────────────────────────────────────────

const COST_ESTIMATOR_SYSTEM_PROMPT = `You are a cost estimation specialist for Los Angeles rental apartments. Your job is to provide detailed, accurate cost breakdowns for renters.

When given listing details and a cost breakdown, generate a clear, friendly summary that:
1. Highlights the total move-in cost prominently
2. Breaks down monthly recurring costs
3. Notes one-time moving costs
4. Provides helpful tips for saving money
5. Warns about any costs that seem unusually high

Keep the response concise but informative. Use dollar amounts formatted with commas.
Mention LA-specific considerations (LADWP billing, rent control if applicable, etc.).`;

const COST_ESTIMATOR_CONFIG: AgentConfig = {
  name: 'CostEstimator',
  model: MODELS.HAIKU,
  systemPrompt: COST_ESTIMATOR_SYSTEM_PROMPT,
  maxTokens: 1024,
  temperature: 0.3,
  timeoutMs: 15_000,
};

// ─── Cost Estimator Agent ───────────────────────────────────────

export class CostEstimatorAgent extends BaseAgent {
  private client: Anthropic;

  constructor() {
    super(COST_ESTIMATOR_CONFIG);
    this.client = getAnthropicClient();
  }

  async *execute(context: SubAgentContext): AsyncGenerator<StreamEvent> {
    yield this.statusEvent('estimating');

    // Extract rent amount from context
    const rent = this.extractRentAmount(context);
    if (rent <= 0) {
      yield* streamText(
        "I need a rent amount to calculate costs. Could you tell me the monthly rent for the apartment you're interested in? Or I can estimate based on a budget range if you share that.",
        this.name,
        20,
      );
      return;
    }

    // Determine listing characteristics
    const bedrooms = this.extractBedrooms(context);
    const hasPets = this.extractPetStatus(context);
    const hasParking = this.extractParkingStatus(context);
    const listingId = context.extractedParams.listingIds?.[0];

    // Calculate the estimate
    const estimate = this.calculateEstimate({
      rent,
      bedrooms,
      hasPets,
      hasParking,
      listingId,
    });

    // Persist the estimate to the cost_estimates table
    await this.persistEstimate(estimate, context.userId);

    // Emit the structured cost estimate event
    yield {
      type: 'cost_estimate',
      estimate,
      agentName: this.name,
    };

    // Generate a natural language summary via Claude
    yield this.statusEvent('analyzing');

    try {
      const summary = await this.generateSummary(estimate, context);
      yield* streamText(summary, this.name, 15);
    } catch (err) {
      console.error('[CostEstimator] Summary generation failed:', err);
      // Fall back to a simple formatted summary
      yield* streamText(this.formatFallbackSummary(estimate), this.name, 15);
    }
  }

  // ─── Cost Calculation ─────────────────────────────────────────

  private calculateEstimate(params: {
    rent: number;
    bedrooms: number;
    hasPets: boolean;
    hasParking: boolean;
    listingId?: string;
  }): CostEstimateData {
    const { rent, bedrooms, hasPets, hasParking, listingId } = params;

    // ── Move-in costs ────────
    const firstMonthRent = rent;
    const lastMonthRent = rent;
    const securityDeposit = Math.round(rent * LA_COSTS.securityDepositMultiplier);
    const petDeposit = hasPets ? LA_COSTS.petDeposit : 0;
    const applicationFee = LA_COSTS.applicationFee;
    const brokerFee = Math.round(rent * LA_COSTS.brokerFeePct);
    const moveInTotal =
      firstMonthRent + lastMonthRent + securityDeposit +
      petDeposit + applicationFee + brokerFee;

    // ── Monthly costs ────────
    const electricity = LA_COSTS.electricity;
    const gas = LA_COSTS.gas;
    const water = LA_COSTS.water;
    const internet = LA_COSTS.internet;
    const rentersInsurance = LA_COSTS.rentersInsurance;
    const parkingFee = hasParking ? LA_COSTS.parkingFee : 0;
    const petRent = hasPets ? LA_COSTS.petRent : 0;
    const monthlyTotal =
      rent + electricity + gas + water + internet +
      rentersInsurance + parkingFee + petRent;

    // ── Moving costs ─────────
    const sizeKey = this.sizeKeyFromBedrooms(bedrooms);
    const movingCompany = LA_COSTS.movers[sizeKey];
    const truckRental = LA_COSTS.truckRental[sizeKey];
    const packingSupplies = LA_COSTS.packingSupplies[sizeKey];
    const storageCosts = LA_COSTS.storageCosts;
    const movingTotal = movingCompany + truckRental + packingSupplies + storageCosts;

    // ── Grand total ──────────
    const grandTotal = moveInTotal + movingTotal;

    // ── Notes ────────────────
    const notes = this.buildNotes(rent, hasPets, hasParking, bedrooms);

    return {
      listingId,
      monthlyRent: rent,
      moveIn: {
        firstMonthRent,
        lastMonthRent,
        securityDeposit,
        petDeposit,
        applicationFee,
        brokerFee,
        total: moveInTotal,
      },
      monthly: {
        rent,
        electricity,
        gas,
        water,
        internet,
        rentersInsurance,
        parkingFee,
        petRent,
        total: monthlyTotal,
      },
      moving: {
        movingCompany,
        truckRental,
        packingSupplies,
        storageCosts,
        total: movingTotal,
      },
      grandTotal,
      notes,
    };
  }

  private sizeKeyFromBedrooms(
    bedrooms: number,
  ): 'studio' | 'oneBed' | 'twoBed' | 'threePlus' {
    if (bedrooms === 0) return 'studio';
    if (bedrooms === 1) return 'oneBed';
    if (bedrooms === 2) return 'twoBed';
    return 'threePlus';
  }

  private buildNotes(
    rent: number,
    hasPets: boolean,
    hasParking: boolean,
    bedrooms: number,
  ): string {
    const parts: string[] = [];
    parts.push(`Base rent: $${rent.toLocaleString()}/mo`);
    parts.push(
      `Utilities estimate: LADWP electric ~$${LA_COSTS.electricity}, SoCalGas ~$${LA_COSTS.gas}, water/sewer ~$${LA_COSTS.water}, internet ~$${LA_COSTS.internet}`,
    );
    parts.push(`Security deposit: ${LA_COSTS.securityDepositMultiplier}x monthly rent`);
    if (hasPets) {
      parts.push(`Pet deposit: $${LA_COSTS.petDeposit}, monthly pet rent: $${LA_COSTS.petRent}`);
    }
    if (hasParking) {
      parts.push(`Parking: $${LA_COSTS.parkingFee}/mo`);
    }
    parts.push(`Moving estimate based on ${bedrooms === 0 ? 'studio' : `${bedrooms}BR`} apartment`);
    return parts.join('. ');
  }

  // ─── Persistence ──────────────────────────────────────────────

  private async persistEstimate(
    estimate: CostEstimateData,
    userId: string,
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('cost_estimates').insert({
        user_id: userId,
        listing_id: estimate.listingId ?? null,
        first_month_rent: estimate.moveIn.firstMonthRent,
        last_month_rent: estimate.moveIn.lastMonthRent,
        security_deposit: estimate.moveIn.securityDeposit,
        pet_deposit: estimate.moveIn.petDeposit,
        application_fee: estimate.moveIn.applicationFee,
        broker_fee: estimate.moveIn.brokerFee,
        move_in_total: estimate.moveIn.total,
        monthly_rent: estimate.monthly.rent,
        utilities_estimate:
          estimate.monthly.electricity +
          estimate.monthly.gas +
          estimate.monthly.water +
          estimate.monthly.internet,
        parking_fee: estimate.monthly.parkingFee,
        pet_rent: estimate.monthly.petRent,
        renters_insurance: estimate.monthly.rentersInsurance,
        monthly_total: estimate.monthly.total,
        moving_company_quote: estimate.moving.movingCompany,
        packing_materials: estimate.moving.packingSupplies,
        storage_costs: estimate.moving.storageCosts,
        travel_costs: 0,
        moving_total: estimate.moving.total,
        estimate_notes: estimate.notes,
      });
    } catch (err) {
      console.error('[CostEstimator] Failed to persist estimate:', err);
      // Non-fatal
    }
  }

  // ─── Natural Language Summary via Claude ──────────────────────

  private async generateSummary(
    estimate: CostEstimateData,
    context: SubAgentContext,
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: this.config.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a cost breakdown summary for this LA apartment rental estimate:

Move-in costs:
- First month rent: $${estimate.moveIn.firstMonthRent.toLocaleString()}
- Last month rent: $${estimate.moveIn.lastMonthRent.toLocaleString()}
- Security deposit: $${estimate.moveIn.securityDeposit.toLocaleString()}
${estimate.moveIn.petDeposit > 0 ? `- Pet deposit: $${estimate.moveIn.petDeposit.toLocaleString()}` : ''}
- Application fee: $${estimate.moveIn.applicationFee}
- TOTAL move-in: $${estimate.moveIn.total.toLocaleString()}

Monthly costs:
- Rent: $${estimate.monthly.rent.toLocaleString()}
- LADWP electricity: $${estimate.monthly.electricity}
- SoCalGas: $${estimate.monthly.gas}
- Water/sewer: $${estimate.monthly.water}
- Internet: $${estimate.monthly.internet}
- Renter's insurance: $${estimate.monthly.rentersInsurance}
${estimate.monthly.parkingFee > 0 ? `- Parking: $${estimate.monthly.parkingFee}` : ''}
${estimate.monthly.petRent > 0 ? `- Pet rent: $${estimate.monthly.petRent}` : ''}
- TOTAL monthly: $${estimate.monthly.total.toLocaleString()}

Moving costs:
- Professional movers: $${estimate.moving.movingCompany.toLocaleString()}
- Truck rental: $${estimate.moving.truckRental}
- Packing supplies: $${estimate.moving.packingSupplies}
- TOTAL moving: $${estimate.moving.total.toLocaleString()}

GRAND TOTAL to move in: $${estimate.grandTotal.toLocaleString()}

User message: "${context.userMessage}"`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock && textBlock.type === 'text'
      ? textBlock.text
      : this.formatFallbackSummary(estimate);
  }

  // ─── Fallback Summary ─────────────────────────────────────────

  private formatFallbackSummary(estimate: CostEstimateData): string {
    return `Here's your cost breakdown for $${estimate.monthlyRent.toLocaleString()}/mo rent:

**Move-in Costs: $${estimate.moveIn.total.toLocaleString()}**
- First month: $${estimate.moveIn.firstMonthRent.toLocaleString()}
- Last month: $${estimate.moveIn.lastMonthRent.toLocaleString()}
- Security deposit: $${estimate.moveIn.securityDeposit.toLocaleString()}
${estimate.moveIn.petDeposit > 0 ? `- Pet deposit: $${estimate.moveIn.petDeposit.toLocaleString()}\n` : ''}- Application fee: $${estimate.moveIn.applicationFee}

**Monthly Costs: $${estimate.monthly.total.toLocaleString()}/mo**
- Rent: $${estimate.monthly.rent.toLocaleString()}
- Utilities: $${(estimate.monthly.electricity + estimate.monthly.gas + estimate.monthly.water).toLocaleString()} (LADWP + SoCalGas)
- Internet: $${estimate.monthly.internet}
- Renter's insurance: $${estimate.monthly.rentersInsurance}
${estimate.monthly.parkingFee > 0 ? `- Parking: $${estimate.monthly.parkingFee}\n` : ''}${estimate.monthly.petRent > 0 ? `- Pet rent: $${estimate.monthly.petRent}\n` : ''}
**Moving Costs: $${estimate.moving.total.toLocaleString()}**
- Movers: $${estimate.moving.movingCompany.toLocaleString()}
- Truck + supplies: $${(estimate.moving.truckRental + estimate.moving.packingSupplies).toLocaleString()}

**Total to move in: $${estimate.grandTotal.toLocaleString()}**`;
  }

  // ─── Parameter Extraction Helpers ─────────────────────────────

  private extractRentAmount(context: SubAgentContext): number {
    // Check extracted params for budget
    if (context.extractedParams.maxBudget) {
      return context.extractedParams.maxBudget;
    }

    // Try to find a dollar amount in the user's message
    const dollarMatch = context.userMessage.match(
      /\$[\s]*([\d,]+)/,
    );
    if (dollarMatch) {
      return parseInt(dollarMatch[1].replace(/,/g, ''), 10);
    }

    // Try to find a number followed by "a month" or "/mo"
    const monthlyMatch = context.userMessage.match(
      /([\d,]+)\s*(?:\/mo|a month|per month|monthly)/i,
    );
    if (monthlyMatch) {
      return parseInt(monthlyMatch[1].replace(/,/g, ''), 10);
    }

    // Fall back to user preferences
    if (context.preferences?.max_budget) {
      return context.preferences.max_budget;
    }

    return 0;
  }

  private extractBedrooms(context: SubAgentContext): number {
    if (context.extractedParams.minBedrooms != null) {
      return context.extractedParams.minBedrooms;
    }
    if (context.preferences?.min_bedrooms != null) {
      return context.preferences.min_bedrooms;
    }
    return 1;
  }

  private extractPetStatus(context: SubAgentContext): boolean {
    if (context.extractedParams.petFriendly != null) {
      return context.extractedParams.petFriendly;
    }
    return context.preferences?.pet_friendly ?? false;
  }

  private extractParkingStatus(context: SubAgentContext): boolean {
    if (context.extractedParams.parkingRequired != null) {
      return context.extractedParams.parkingRequired;
    }
    return context.preferences?.parking_required ?? false;
  }
}
