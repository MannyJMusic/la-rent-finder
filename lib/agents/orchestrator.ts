/**
 * Orchestrator Agent
 *
 * The top-level agent that:
 *  1. Receives user messages from the chat API
 *  2. Uses Claude to classify intent and extract parameters
 *  3. Delegates to the appropriate sub-agent
 *  4. Aggregates sub-agent responses and yields them as StreamEvents
 *  5. Maintains conversation context
 *
 * The chat API route calls:
 *   const orchestrator = new OrchestratorAgent();
 *   for await (const event of orchestrator.invoke(request)) { ... }
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  BaseAgent,
  AgentRegistry,
  getAnthropicClient,
  streamText,
  MODELS,
} from './framework';
import type {
  AgentConfig,
  AgentIntent,
  ExtractedParams,
  OrchestratorRequest,
  StreamEvent,
  SubAgentContext,
} from './types';

// ─── Orchestrator System Prompt ─────────────────────────────────

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the orchestrator for an LA rental apartment finder. Your job is to:
1. Understand the user's intent
2. Extract relevant parameters from their message
3. Decide which specialist agent should handle the request

You must respond with a JSON object (no markdown, no explanation) with this exact shape:

{
  "intent": "search" | "refine" | "schedule" | "estimate" | "save" | "status" | "general" | "preferences",
  "confidence": <number 0-1>,
  "params": {
    "neighborhoods": ["string"] | undefined,
    "minBudget": number | undefined,
    "maxBudget": number | undefined,
    "minBedrooms": number | undefined,
    "maxBedrooms": number | undefined,
    "minBathrooms": number | undefined,
    "maxBathrooms": number | undefined,
    "amenities": ["string"] | undefined,
    "petFriendly": boolean | undefined,
    "parkingRequired": boolean | undefined,
    "listingIds": ["string"] | undefined,
    "requestedDate": "YYYY-MM-DD" | undefined,
    "requestedTime": "HH:MM" | undefined,
    "searchQuery": "string" | undefined,
    "propertyTypes": ["string"] | undefined
  },
  "reasoning": "brief explanation of why you chose this intent"
}

Intent definitions:
- "search": User wants to find new rental listings (e.g. "find me a 2BR in Silver Lake")
- "refine": User wants to narrow down or modify existing search results (e.g. "can you show cheaper options?")
- "schedule": User wants to schedule a viewing or tour (e.g. "I'd like to see that apartment Saturday")
- "estimate": User wants cost breakdown or budget analysis (e.g. "how much would it cost to move there?")
- "save": User wants to save/bookmark a listing (e.g. "save that one")
- "status": User asks about their saved listings, appointments, or search status
- "general": General rental advice, LA neighborhood info, or greetings
- "preferences": User is setting or updating their search preferences

Property type extraction:
- "I want a house" -> propertyTypes: ["house"]
- "looking for a condo or townhouse" -> propertyTypes: ["condo", "townhouse"]
- "apartment" -> propertyTypes: ["apartment"]
- Valid types: "apartment", "house", "condo", "townhouse", "room"
- If user doesn't specify a type, use their stored preferences as default

Extract as many parameters as you can from the message and conversation history. Use the user's stored preferences as fallback values when relevant.`;

// ─── Intent to Agent Name Mapping ───────────────────────────────

const INTENT_AGENT_MAP: Record<AgentIntent, string | null> = {
  search: 'MarketResearcher',
  refine: 'MarketResearcher',
  schedule: 'AppointmentScheduler',
  estimate: 'CostEstimator',
  save: null,       // Handled directly by orchestrator
  status: null,     // Handled directly by orchestrator
  general: null,    // Handled directly by orchestrator
  preferences: null, // Handled directly by orchestrator
};

// ─── Intent to Status Mapping ───────────────────────────────────

const INTENT_STATUS_MAP: Record<AgentIntent, StreamEvent['type'] extends 'status' ? never : string> = {
  search: 'searching',
  refine: 'searching',
  schedule: 'scheduling',
  estimate: 'estimating',
  save: 'thinking',
  status: 'thinking',
  general: 'thinking',
  preferences: 'thinking',
};

// ─── Orchestrator Configuration ─────────────────────────────────

const ORCHESTRATOR_CONFIG: AgentConfig = {
  name: 'Orchestrator',
  model: MODELS.SONNET,
  systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
  maxTokens: 1024,
  temperature: 0.1,
  timeoutMs: 30_000,
};

// ─── Response Generation System Prompt ──────────────────────────

const GENERAL_RESPONSE_SYSTEM_PROMPT = `You are a friendly, knowledgeable assistant for an LA rental apartment finder app. You help users find rental properties in Los Angeles.

You can help with:
- Searching for rental properties in LA neighborhoods
- Providing neighborhood information (safety, walkability, amenities, vibe)
- Estimating move-in and monthly costs
- Scheduling property viewings
- General rental advice for LA

Keep your responses concise, helpful, and focused on LA rentals. Use a warm, professional tone.
When the user greets you, briefly introduce yourself and what you can help with.
When the user asks about preferences, explain what preferences you can track (budget, bedrooms, neighborhoods, amenities, pets, parking).`;

// ─── Orchestrator Agent Class ───────────────────────────────────

export class OrchestratorAgent extends BaseAgent {
  private client: Anthropic;

  constructor() {
    super(ORCHESTRATOR_CONFIG);
    this.client = getAnthropicClient();
  }

  /**
   * Main entry point called by the chat API route.
   * Converts an OrchestratorRequest into a SubAgentContext and runs execute().
   */
  async *invoke(request: OrchestratorRequest): AsyncGenerator<StreamEvent> {
    // Signal that we're starting to think
    yield this.statusEvent('thinking');

    // Step 1: Classify intent and extract params
    let intent: AgentIntent;
    let extractedParams: ExtractedParams;

    try {
      const classification = await this.classifyIntent(request);
      intent = classification.intent;
      extractedParams = classification.params;
    } catch (err) {
      console.error('[Orchestrator] Intent classification failed:', err);
      // Fall back to general intent
      intent = 'general';
      extractedParams = {};
    }

    // Build sub-agent context
    const subContext: SubAgentContext = {
      userMessage: request.message,
      intent,
      userId: request.userId,
      conversationId: request.conversationId,
      chatHistory: request.chatHistory,
      preferences: request.preferences,
      extractedParams,
    };

    // Step 2: Determine which agent handles this
    const targetAgentName = INTENT_AGENT_MAP[intent];

    if (targetAgentName) {
      // Delegate to a sub-agent
      const subAgent = AgentRegistry.get(targetAgentName);

      if (!subAgent) {
        // Agent not registered — generate a response ourselves
        console.warn(
          `[Orchestrator] Agent "${targetAgentName}" not found in registry, handling directly`,
        );
        yield* this.handleDirectly(subContext);
        return;
      }

      // Notify client about handoff
      yield {
        type: 'agent_handoff',
        fromAgent: this.name,
        toAgent: subAgent.name,
        reason: `Handling ${intent} request`,
      };

      // Update status based on intent
      const statusForIntent = INTENT_STATUS_MAP[intent] as
        | 'searching'
        | 'scheduling'
        | 'estimating'
        | 'thinking';
      yield this.statusEvent(statusForIntent);

      // Execute sub-agent with safety wrapper
      yield* subAgent.safeExecute(subContext);
    } else {
      // Handle directly (general, status, save, preferences)
      yield* this.handleDirectly(subContext);
    }

    // Step 3: Done
    yield { type: 'done', metadata: { intent, conversationId: request.conversationId } };
  }

  /**
   * The execute() method required by BaseAgent.
   * For the orchestrator, `invoke()` is the primary entry point,
   * but execute() is needed if the orchestrator itself is called as a sub-agent.
   */
  async *execute(context: SubAgentContext): AsyncGenerator<StreamEvent> {
    // Build a synthetic OrchestratorRequest from the sub-agent context
    const request: OrchestratorRequest = {
      message: context.userMessage,
      userId: context.userId,
      conversationId: context.conversationId,
      chatHistory: context.chatHistory,
      preferences: context.preferences,
    };
    yield* this.invoke(request);
  }

  // ─── Intent Classification ──────────────────────────────────

  private async classifyIntent(
    request: OrchestratorRequest,
  ): Promise<{ intent: AgentIntent; params: ExtractedParams; confidence: number }> {
    // Build conversation messages for context
    const messages: Anthropic.MessageParam[] = [];

    // Include recent history (last 6 messages for context)
    const recentHistory = request.chatHistory.slice(-6);
    for (const entry of recentHistory) {
      messages.push({
        role: entry.role === 'user' ? 'user' : 'assistant',
        content: entry.content,
      });
    }

    // Add the current message with preference context
    let userMessageContent = request.message;
    if (request.preferences) {
      userMessageContent += `\n\n[User preferences on file: ${JSON.stringify(request.preferences)}]`;
    }

    messages.push({ role: 'user', content: userMessageContent });

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: this.config.systemPrompt,
      messages,
    });

    // Parse the JSON response
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from intent classifier');
    }

    const raw = textBlock.text.trim();
    // Handle potential markdown code fences
    const jsonStr = raw.startsWith('{') ? raw : raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    let parsed: {
      intent: AgentIntent;
      confidence: number;
      params: ExtractedParams;
      reasoning: string;
    };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[Orchestrator] Failed to parse intent JSON:', jsonStr);
      return { intent: 'general', params: {}, confidence: 0 };
    }

    // Validate intent is a known value
    const validIntents: AgentIntent[] = [
      'search', 'refine', 'schedule', 'estimate',
      'save', 'status', 'general', 'preferences',
    ];
    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = 'general';
    }

    return {
      intent: parsed.intent,
      params: parsed.params || {},
      confidence: parsed.confidence ?? 0.5,
    };
  }

  // ─── Direct Response Handling ─────────────────────────────────

  /**
   * For intents the orchestrator handles itself (general, status, save, preferences),
   * generate a conversational response using Claude.
   */
  private async *handleDirectly(
    context: SubAgentContext,
  ): AsyncGenerator<StreamEvent> {
    yield this.statusEvent('analyzing');

    try {
      const messages: Anthropic.MessageParam[] = [];

      // Include conversation history
      const recentHistory = context.chatHistory.slice(-6);
      for (const entry of recentHistory) {
        messages.push({
          role: entry.role === 'user' ? 'user' : 'assistant',
          content: entry.content,
        });
      }

      let userContent = context.userMessage;
      if (context.preferences) {
        userContent += `\n\n[User preferences: ${JSON.stringify(context.preferences)}]`;
      }
      messages.push({ role: 'user', content: userContent });

      // Use streaming for real-time text delivery
      const stream = this.client.messages.stream({
        model: MODELS.SONNET,
        max_tokens: 1024,
        temperature: 0.7,
        system: GENERAL_RESPONSE_SYSTEM_PROMPT,
        messages,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield this.messageEvent(event.delta.text);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate response';
      console.error('[Orchestrator] Direct response error:', err);
      yield this.errorEvent(message, 'GENERATION_ERROR');

      // Fallback response
      yield* streamText(
        "I'm sorry, I encountered an issue generating a response. I can help you search for properties, estimate costs, or schedule viewings in Los Angeles. What would you like to do?",
        this.name,
      );
    }
  }
}
