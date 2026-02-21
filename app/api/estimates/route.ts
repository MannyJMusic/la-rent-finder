import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// LA-specific cost defaults
const LA_COSTS = {
  electricity: 150,
  gas: 45,
  water: 65,
  internet: 65,
  renters_insurance: 25,
  movers: 1500,
  packing_materials: 150,
  utility_setup: 100,
  security_deposit_multiplier: 1.5,
  application_fee: 50,
  broker_fee_pct: 0,       // uncommon in LA
  pet_deposit: 500,
  pet_rent: 50,
  parking_fee: 150,
  storage_costs: 200,
  travel_costs: 0,
};

interface EstimateBody {
  apartment_id: string;
  estimate_type?: 'full' | 'move_in' | 'monthly' | 'moving';
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as EstimateBody;
    const { apartment_id, estimate_type } = body;

    if (!apartment_id) {
      return NextResponse.json({ error: 'apartment_id is required' }, { status: 400 });
    }

    // Fetch the apartment to get price and features
    const { data: apartment, error: aptError } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', apartment_id)
      .single();

    if (aptError || !apartment) {
      return NextResponse.json({ error: 'Apartment not found' }, { status: 404 });
    }

    const rent = apartment.price;
    const hasPets = apartment.pet_policy !== null;
    const hasParking = apartment.parking_available;

    // Calculate costs
    const first_month_rent = rent;
    const last_month_rent = rent;
    const security_deposit = Math.round(rent * LA_COSTS.security_deposit_multiplier);
    const pet_deposit = hasPets ? LA_COSTS.pet_deposit : 0;
    const application_fee = LA_COSTS.application_fee;
    const broker_fee = Math.round(rent * LA_COSTS.broker_fee_pct);

    const move_in_total = first_month_rent + last_month_rent + security_deposit + pet_deposit + application_fee + broker_fee;

    // Monthly costs
    const monthly_rent = rent;
    const utilities_estimate = LA_COSTS.electricity + LA_COSTS.gas + LA_COSTS.water + LA_COSTS.internet;
    const parking_fee = hasParking ? LA_COSTS.parking_fee : 0;
    const pet_rent = hasPets ? LA_COSTS.pet_rent : 0;
    const renters_insurance = LA_COSTS.renters_insurance;

    const monthly_total = monthly_rent + utilities_estimate + parking_fee + pet_rent + renters_insurance;

    // Moving costs
    const moving_company_quote = LA_COSTS.movers;
    const packing_materials = LA_COSTS.packing_materials;
    const storage_costs = LA_COSTS.storage_costs;
    const travel_costs = LA_COSTS.travel_costs;

    const moving_total = moving_company_quote + packing_materials + storage_costs + travel_costs;

    // Build notes
    const notes_parts: string[] = [];
    notes_parts.push(`Estimate for: ${apartment.title}`);
    notes_parts.push(`Base rent: $${rent}/mo`);
    notes_parts.push(`Utilities breakdown: Electric $${LA_COSTS.electricity}, Gas $${LA_COSTS.gas}, Water $${LA_COSTS.water}, Internet $${LA_COSTS.internet}`);
    if (hasPets) notes_parts.push(`Pet-friendly: deposit $${pet_deposit}, monthly pet rent $${pet_rent}`);
    if (hasParking) notes_parts.push(`Parking included at $${parking_fee}/mo`);
    notes_parts.push(`Security deposit: 1.5x monthly rent`);
    const estimate_notes = notes_parts.join('. ');

    const { data: estimate, error: insertError } = await supabase
      .from('cost_estimates')
      .insert({
        user_id: user.id,
        listing_id: apartment_id,
        first_month_rent,
        last_month_rent,
        security_deposit,
        pet_deposit,
        application_fee,
        broker_fee,
        move_in_total,
        monthly_rent,
        utilities_estimate,
        parking_fee,
        pet_rent,
        renters_insurance,
        monthly_total,
        moving_company_quote,
        packing_materials,
        storage_costs,
        travel_costs,
        moving_total,
        estimate_notes,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ estimate }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
