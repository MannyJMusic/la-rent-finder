-- LA Rent Finder - Comprehensive Seed Data
-- Created: 2026-02-11
-- Updated: 2026-02-20
-- Description: Realistic LA rental seed data for development and testing
--
-- Covers: 5 users, 30 apartments, user_preferences, searches,
--         listing_scores, cost_estimates, appointments, favorites,
--         messages, chats, chat_messages, communications

-- Clear existing data (development only)
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE communications CASCADE;
TRUNCATE TABLE cost_estimates CASCADE;
TRUNCATE TABLE listing_scores CASCADE;
TRUNCATE TABLE searches CASCADE;
TRUNCATE TABLE user_preferences CASCADE;
TRUNCATE TABLE chats CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE favorites CASCADE;
TRUNCATE TABLE apartments CASCADE;
TRUNCATE TABLE users CASCADE;

-- ==========================================
-- USERS (5 test users)
-- ==========================================
-- Password for all test users: TestPassword123! (bcrypt hash)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, preferences) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'john.doe@example.com',
    '$2a$10$xJ8Kq2Q3Z5V7Y9X1C3E5aeR7T9U1W3Y5a7C9e1G3i5K7m9O1q3S5u',
    'John',
    'Doe',
    '(310) 555-0101',
    '{"max_price": 3000, "min_bedrooms": 2, "preferred_neighborhoods": ["Santa Monica", "Venice", "Culver City"], "pet_friendly": true, "parking_required": true}'::jsonb
),
(
    '22222222-2222-2222-2222-222222222222',
    'jane.smith@example.com',
    '$2a$10$xJ8Kq2Q3Z5V7Y9X1C3E5aeR7T9U1W3Y5a7C9e1G3i5K7m9O1q3S5u',
    'Jane',
    'Smith',
    '(323) 555-0202',
    '{"max_price": 2500, "min_bedrooms": 1, "preferred_neighborhoods": ["Downtown LA", "Koreatown", "Echo Park"], "pet_friendly": false, "parking_required": false}'::jsonb
),
(
    '33333333-3333-3333-3333-333333333333',
    'mike.johnson@example.com',
    '$2a$10$xJ8Kq2Q3Z5V7Y9X1C3E5aeR7T9U1W3Y5a7C9e1G3i5K7m9O1q3S5u',
    'Mike',
    'Johnson',
    '(424) 555-0303',
    '{"max_price": 4500, "min_bedrooms": 3, "preferred_neighborhoods": ["West Hollywood", "Beverly Grove", "Los Feliz"], "pet_friendly": true, "parking_required": true}'::jsonb
),
(
    '44444444-4444-4444-4444-444444444444',
    'sarah.lee@example.com',
    '$2a$10$xJ8Kq2Q3Z5V7Y9X1C3E5aeR7T9U1W3Y5a7C9e1G3i5K7m9O1q3S5u',
    'Sarah',
    'Lee',
    '(213) 555-0404',
    '{"max_price": 2000, "min_bedrooms": 0, "preferred_neighborhoods": ["Silver Lake", "Highland Park", "Eagle Rock"], "pet_friendly": false, "parking_required": false}'::jsonb
),
(
    '55555555-5555-5555-5555-555555555555',
    'carlos.garcia@example.com',
    '$2a$10$xJ8Kq2Q3Z5V7Y9X1C3E5aeR7T9U1W3Y5a7C9e1G3i5K7m9O1q3S5u',
    'Carlos',
    'Garcia',
    '(818) 555-0505',
    '{"max_price": 3500, "min_bedrooms": 2, "preferred_neighborhoods": ["Culver City", "Mar Vista", "Palms"], "pet_friendly": true, "parking_required": true}'::jsonb
);

-- ==========================================
-- APARTMENTS (30 realistic LA listings)
-- ==========================================
INSERT INTO apartments (
    id, title, description, address, location, price, latitude, longitude,
    bedrooms, bathrooms, square_feet, amenities, photos, availability_score,
    available_date, lease_term, pet_policy, parking_available, furnished,
    listing_url, contact_email, contact_phone, landlord_name
) VALUES
-- 1. Silver Lake studio
(
    'a0000001-0001-0001-0001-000000000001',
    'Bright Studio with Reservoir Views in Silver Lake',
    'Sun-drenched studio overlooking the Silver Lake Reservoir. Original hardwood floors, arched doorways, and a renovated kitchen with quartz counters. Shared laundry in building. Walk to Intelligentsia, Sawyer, and the Saturday farmers market.',
    '2315 Silver Lake Blvd, Los Angeles, CA 90039',
    'Silver Lake',
    1750.00,
    34.0853,
    -118.2625,
    0,
    1.0,
    480,
    '["Hardwood Floors", "Renovated Kitchen", "Shared Laundry", "Street Parking"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    0.92,
    '2026-03-01',
    '12 months',
    'No pets',
    false,
    false,
    'https://example.com/listing/sl-studio-01',
    'reservoirprops@example.com',
    '(323) 555-1001',
    'Reservoir Properties LLC'
),
-- 2. Silver Lake 1BR
(
    'a0000001-0001-0001-0001-000000000002',
    'Hip 1BR Apartment Near Sunset Junction',
    'Stylish 1-bedroom in the heart of Silver Lake nightlife and dining. Exposed brick accent wall, central AC, and a private balcony overlooking Sunset Blvd. One tandem parking spot included.',
    '3108 Sunset Blvd, Los Angeles, CA 90026',
    'Silver Lake',
    2350.00,
    34.0821,
    -118.2675,
    1,
    1.0,
    720,
    '["Central AC", "Balcony", "Exposed Brick", "Tandem Parking", "Dishwasher"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.78,
    '2026-03-15',
    '12 months',
    'Cats allowed with $500 deposit',
    true,
    false,
    'https://example.com/listing/sl-1br-02',
    'sunsetjunction@example.com',
    '(323) 555-1002',
    'Sunset Junction Realty'
),
-- 3. Echo Park 1BR
(
    'a0000001-0001-0001-0001-000000000003',
    'Charming 1BR with Lake Views in Echo Park',
    'Beautiful 1-bedroom with views of Echo Park Lake from the living room. Original tile floors, built-in shelving, and a cozy breakfast nook. Walking distance to Stories Books & Cafe, Beacon, and Echo Park Lake pedal boats.',
    '1548 Echo Park Ave, Los Angeles, CA 90026',
    'Echo Park',
    2100.00,
    34.0762,
    -118.2595,
    1,
    1.0,
    680,
    '["Lake Views", "Tile Floors", "Built-In Shelving", "Shared Laundry", "Street Parking"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
    0.85,
    '2026-03-01',
    '12 months',
    'Small pets negotiable',
    false,
    false,
    'https://example.com/listing/ep-1br-03',
    'echoparkhomes@example.com',
    '(213) 555-1003',
    'Echo Park Homes'
),
-- 4. Echo Park 2BR
(
    'a0000001-0001-0001-0001-000000000004',
    'Renovated 2BR Bungalow in Echo Park',
    'Completely renovated 2-bed craftsman bungalow with private yard. Open floor plan, brand new kitchen with stainless appliances, washer/dryer hookups, and a detached garage. Close to Dodger Stadium.',
    '722 Baxter St, Los Angeles, CA 90012',
    'Echo Park',
    3100.00,
    34.0712,
    -118.2509,
    2,
    1.0,
    1050,
    '["Private Yard", "Garage", "Washer/Dryer Hookups", "Stainless Appliances", "Renovated Kitchen"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.70,
    '2026-04-01',
    '12 months',
    'Dogs allowed (under 40lbs) with $750 deposit',
    true,
    false,
    'https://example.com/listing/ep-2br-04',
    'baxterrentals@example.com',
    '(213) 555-1004',
    'Baxter Properties'
),
-- 5. Santa Monica studio
(
    'a0000001-0001-0001-0001-000000000005',
    'Modern Studio 2 Blocks from the Beach',
    'Bright and airy studio apartment just 2 blocks from the beach. Features hardwood floors, updated kitchen with granite counters, and building amenities including gym and rooftop deck with ocean views.',
    '1234 Ocean Ave, Santa Monica, CA 90401',
    'Santa Monica',
    2200.00,
    34.0195,
    -118.4912,
    0,
    1.0,
    550,
    '["Hardwood Floors", "Gym", "Rooftop Deck", "In-Unit Laundry", "Dishwasher", "Central AC"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    0.85,
    '2026-03-01',
    '12 months',
    'Cats allowed with $300 deposit',
    true,
    false,
    'https://example.com/listing/sm-studio-05',
    'oceanviewmgmt@example.com',
    '(310) 555-1005',
    'Ocean View Management'
),
-- 6. Santa Monica 1BR
(
    'a0000001-0001-0001-0001-000000000006',
    'Spacious 1BR in Santa Monica with Parking',
    'Large 1-bedroom on a tree-lined street in north Santa Monica. Updated bathroom, ample closet space, designated parking spot. Walk to Montana Ave shops and restaurants. Quick bus ride to the beach.',
    '745 Montana Ave, Santa Monica, CA 90403',
    'Santa Monica',
    2650.00,
    34.0340,
    -118.5005,
    1,
    1.0,
    780,
    '["Updated Bathroom", "Parking", "Walk-In Closet", "Shared Laundry", "Courtyard"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.80,
    '2026-02-28',
    '12 months',
    'No pets',
    true,
    false,
    'https://example.com/listing/sm-1br-06',
    'montanarentals@example.com',
    '(310) 555-1006',
    'Montana Ave Properties'
),
-- 7. Santa Monica 2BR
(
    'a0000001-0001-0001-0001-000000000007',
    'Ocean-View 2BR Condo Near 3rd Street Promenade',
    'Gorgeous 2-bedroom condo with partial ocean views from the master bedroom. Walk to 3rd Street Promenade and Santa Monica Pier. In-unit washer/dryer, two parking spaces, and a community pool.',
    '401 Santa Monica Blvd, Santa Monica, CA 90401',
    'Santa Monica',
    4200.00,
    34.0175,
    -118.4962,
    2,
    2.0,
    1150,
    '["Ocean Views", "In-Unit Laundry", "Pool", "Two Parking Spots", "Dishwasher", "Central AC", "Balcony"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
    0.62,
    '2026-04-01',
    '12 months',
    'No pets',
    true,
    false,
    'https://example.com/listing/sm-2br-07',
    'beachsideleasing@example.com',
    '(310) 555-1007',
    'Beachside Leasing Co'
),
-- 8. Venice 1BR
(
    'a0000001-0001-0001-0001-000000000008',
    'Artsy 1BR Loft Near Abbot Kinney',
    'Industrial-chic loft-style 1-bedroom one block from Abbot Kinney Blvd. Polished concrete floors, 12-foot ceilings, oversized windows, and a galley kitchen. Walk to the beach, restaurants, and boutiques.',
    '456 Abbot Kinney Blvd, Venice, CA 90291',
    'Venice',
    2800.00,
    33.9946,
    -118.4640,
    1,
    1.0,
    850,
    '["High Ceilings", "Concrete Floors", "Large Windows", "Bike Storage", "Street Parking"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.75,
    '2026-03-15',
    '12 months',
    'Dogs allowed (under 30lbs)',
    false,
    false,
    'https://example.com/listing/ven-1br-08',
    'venicepads@example.com',
    '(310) 555-1008',
    'Venice Pads Inc'
),
-- 9. Venice 2BR
(
    'a0000001-0001-0001-0001-000000000009',
    'Spacious 2BR with Rooftop Deck in Venice',
    'Two-bedroom apartment with private rooftop deck and ocean breezes. Recently updated kitchen and bathrooms. Walk to Venice Boardwalk, Muscle Beach, and the canals. Community parking garage.',
    '89 Windward Ave, Venice, CA 90291',
    'Venice',
    3500.00,
    33.9893,
    -118.4729,
    2,
    2.0,
    1100,
    '["Rooftop Deck", "Renovated", "Parking Garage", "Dishwasher", "Central AC", "Pet Friendly"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.72,
    '2026-02-28',
    '12 months',
    'Dogs and cats allowed (under 50lbs)',
    true,
    false,
    'https://example.com/listing/ven-2br-09',
    'windwardrealty@example.com',
    '(310) 555-1009',
    'Windward Realty Group'
),
-- 10. DTLA studio
(
    'a0000001-0001-0001-0001-000000000010',
    'Sleek Studio in DTLA Arts District',
    'Modern studio in a converted warehouse in the Arts District. Polished concrete floors, floor-to-ceiling windows, and a chef kitchen. Building has rooftop pool, gym, and co-working space. Walk to galleries and Bestia.',
    '950 E 3rd St, Los Angeles, CA 90013',
    'Downtown LA',
    1950.00,
    34.0395,
    -118.2312,
    0,
    1.0,
    520,
    '["Pool", "Gym", "Co-Working Space", "Concrete Floors", "Floor-to-Ceiling Windows", "Central AC"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
    0.88,
    '2026-03-01',
    '12 months',
    'Dogs allowed (under 25lbs) with $500 deposit',
    true,
    false,
    'https://example.com/listing/dtla-studio-10',
    'artsdistrictliving@example.com',
    '(213) 555-1010',
    'Arts District Living'
),
-- 11. DTLA 1BR
(
    'a0000001-0001-0001-0001-000000000011',
    'Luxury 1BR in DTLA High-Rise with City Views',
    'Stunning 1-bedroom on the 22nd floor of a modern DTLA tower. Panoramic city views, gourmet kitchen, marble bathroom. Building amenities include infinity pool, sky lounge, valet parking, and 24hr concierge.',
    '889 Francisco St, Los Angeles, CA 90017',
    'Downtown LA',
    2900.00,
    34.0485,
    -118.2620,
    1,
    1.0,
    780,
    '["City Views", "Concierge", "Infinity Pool", "Sky Lounge", "Valet Parking", "In-Unit Laundry", "Central AC"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
    0.65,
    '2026-03-15',
    '12 months',
    'Cats allowed',
    true,
    false,
    'https://example.com/listing/dtla-1br-11',
    'downtownluxury@example.com',
    '(213) 555-1011',
    'Downtown Luxury Leasing'
),
-- 12. DTLA 2BR
(
    'a0000001-0001-0001-0001-000000000012',
    'Historic Loft 2BR in DTLA Spring Street',
    'Converted historic loft with soaring 14-foot ceilings, exposed beams, and original brick walls. Two generous bedrooms, open living area, and chef-grade kitchen. Walk to Grand Central Market and The Broad.',
    '453 S Spring St, Los Angeles, CA 90013',
    'Downtown LA',
    3400.00,
    34.0468,
    -118.2505,
    2,
    1.5,
    1350,
    '["Exposed Brick", "High Ceilings", "Exposed Beams", "Parking", "Shared Laundry", "Central AC"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560185893-a55cbc8c57e8', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.70,
    '2026-04-01',
    '12 months',
    'No pets',
    true,
    false,
    'https://example.com/listing/dtla-2br-12',
    'springstreetlofts@example.com',
    '(213) 555-1012',
    'Spring Street Lofts'
),
-- 13. Highland Park 1BR
(
    'a0000001-0001-0001-0001-000000000013',
    'Cozy 1BR Cottage in Highland Park',
    'Adorable detached cottage on a quiet Highland Park street. Recently remodeled with new flooring, fresh paint, and updated fixtures. Small private patio, perfect for morning coffee. Close to Figueroa St restaurants and York Blvd shops.',
    '5120 Monte Vista St, Los Angeles, CA 90042',
    'Highland Park',
    1800.00,
    34.1110,
    -118.1930,
    1,
    1.0,
    620,
    '["Private Patio", "Remodeled", "New Flooring", "Off-Street Parking"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2'],
    0.91,
    '2026-03-01',
    '12 months',
    'Cats allowed',
    true,
    false,
    'https://example.com/listing/hp-1br-13',
    'hprentals@example.com',
    '(323) 555-1013',
    'Highland Park Rentals'
),
-- 14. Highland Park 2BR
(
    'a0000001-0001-0001-0001-000000000014',
    'Spacious 2BR Apartment on York Blvd',
    'Top-floor 2-bedroom apartment on bustling York Blvd. High ceilings, lots of natural light, large bedrooms, and a dining area. Walk to Coffee and coffee shops, Town Pizza, and Gold Line station.',
    '4912 York Blvd, Los Angeles, CA 90042',
    'Highland Park',
    2400.00,
    34.1092,
    -118.2015,
    2,
    1.0,
    950,
    '["High Ceilings", "Natural Light", "Near Transit", "Shared Laundry", "Street Parking"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.83,
    '2026-03-15',
    '12 months',
    'Small dogs allowed (under 20lbs)',
    false,
    false,
    'https://example.com/listing/hp-2br-14',
    'yorkblvdapts@example.com',
    '(323) 555-1014',
    'York Blvd Apartments'
),
-- 15. Los Feliz studio
(
    'a0000001-0001-0001-0001-000000000015',
    'Classic Studio in Los Feliz Village',
    'Charming studio in a 1920s courtyard building in the heart of Los Feliz Village. Original tile and built-ins, quiet courtyard with fountain. Walk to Griffith Park, the Greek Theatre, and Vermont Ave restaurants.',
    '1922 N Vermont Ave, Los Angeles, CA 90027',
    'Los Feliz',
    1650.00,
    34.1057,
    -118.2916,
    0,
    1.0,
    450,
    '["Courtyard", "Original Tile", "Built-Ins", "Near Griffith Park", "Shared Laundry"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.90,
    '2026-03-01',
    '12 months',
    'No pets',
    false,
    false,
    'https://example.com/listing/lf-studio-15',
    'losfelizcourts@example.com',
    '(323) 555-1015',
    'Los Feliz Courtyard Apts'
),
-- 16. Los Feliz 2BR
(
    'a0000001-0001-0001-0001-000000000016',
    'Stunning 2BR Spanish-Style in Los Feliz',
    'Gorgeous 2-bedroom Spanish Revival apartment with arched windows, tiled kitchen, built-in bookshelves, and a sun room. Steps from Griffith Park hiking trails. Garage parking for one car.',
    '2741 Glendower Ave, Los Angeles, CA 90027',
    'Los Feliz',
    3300.00,
    34.1128,
    -118.2840,
    2,
    1.0,
    1100,
    '["Spanish Style", "Arched Windows", "Sun Room", "Garage Parking", "Near Hiking", "Hardwood Floors"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.68,
    '2026-04-01',
    '12 months',
    'Dogs and cats allowed with $600 deposit',
    true,
    false,
    'https://example.com/listing/lf-2br-16',
    'glendowerprops@example.com',
    '(323) 555-1016',
    'Glendower Properties'
),
-- 17. Koreatown studio
(
    'a0000001-0001-0001-0001-000000000017',
    'Affordable Studio in the Heart of Koreatown',
    'Clean and bright studio in a well-maintained Koreatown building. Close to Metro Purple Line, incredible Korean BBQ, and nightlife. Laundry room and gated parking available.',
    '3450 Wilshire Blvd, Los Angeles, CA 90010',
    'Koreatown',
    1500.00,
    34.0614,
    -118.3095,
    0,
    1.0,
    400,
    '["Near Metro", "Gated Parking", "Laundry Room", "Central AC"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    0.95,
    '2026-02-25',
    '12 months',
    'No pets',
    true,
    false,
    'https://example.com/listing/kt-studio-17',
    'ktownliving@example.com',
    '(213) 555-1017',
    'K-Town Living'
),
-- 18. Koreatown 1BR
(
    'a0000001-0001-0001-0001-000000000018',
    'Renovated 1BR Near Koreatown Nightlife',
    'Newly renovated 1-bedroom with quartz counters, new cabinets, vinyl plank flooring, and modern fixtures. Two blocks from Line Hotel and the best Korean restaurants in LA. Secured underground parking.',
    '3780 6th St, Los Angeles, CA 90020',
    'Koreatown',
    1900.00,
    34.0630,
    -118.3150,
    1,
    1.0,
    650,
    '["Renovated", "Quartz Counters", "Underground Parking", "Central AC", "Dishwasher"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.87,
    '2026-03-01',
    '12 months',
    'Cats allowed',
    true,
    false,
    'https://example.com/listing/kt-1br-18',
    'sixthstmgmt@example.com',
    '(213) 555-1018',
    '6th Street Management'
),
-- 19. Koreatown 2BR
(
    'a0000001-0001-0001-0001-000000000019',
    'Large 2BR Near Koreatown Metro Station',
    'Spacious 2-bedroom with large living room and separate dining area. Building features pool, gym, and BBQ area. Direct access to Metro Purple Line. Great for commuters who work downtown or on the Westside.',
    '3200 Wilshire Blvd, Los Angeles, CA 90010',
    'Koreatown',
    2500.00,
    34.0618,
    -118.3040,
    2,
    2.0,
    1050,
    '["Pool", "Gym", "BBQ Area", "Near Metro", "Parking", "Dishwasher", "Central AC"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    0.80,
    '2026-03-15',
    '12 months',
    'Small pets allowed with $400 deposit',
    true,
    false,
    'https://example.com/listing/kt-2br-19',
    'wilshiretowers@example.com',
    '(213) 555-1019',
    'Wilshire Towers'
),
-- 20. West Hollywood 1BR
(
    'a0000001-0001-0001-0001-000000000020',
    'Chic 1BR on the Sunset Strip',
    'Stylish 1-bedroom on the iconic Sunset Strip. Walk to nightlife, restaurants, and entertainment venues. Modern finishes, stainless appliances, and a small balcony with city views.',
    '8425 Sunset Blvd, West Hollywood, CA 90069',
    'West Hollywood',
    2700.00,
    34.0901,
    -118.3750,
    1,
    1.0,
    700,
    '["City Views", "Balcony", "Stainless Appliances", "Central AC", "Parking"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.73,
    '2026-03-01',
    '12 months',
    'Small dogs allowed (under 15lbs)',
    true,
    false,
    'https://example.com/listing/weho-1br-20',
    'sunsetstriprentals@example.com',
    '(323) 555-1020',
    'Sunset Strip Rentals'
),
-- 21. West Hollywood 2BR
(
    'a0000001-0001-0001-0001-000000000021',
    'Luxury 2BR Near West Hollywood Design District',
    'Upscale 2-bedroom with designer finishes in the heart of WeHo Design District. White oak floors, Bosch appliances, waterfall island, dual vanity bathrooms. Walk to Pacific Design Center, Craigs, and Urth Caffe.',
    '644 N Robertson Blvd, West Hollywood, CA 90069',
    'West Hollywood',
    4500.00,
    34.0825,
    -118.3805,
    2,
    2.0,
    1200,
    '["Designer Finishes", "Bosch Appliances", "In-Unit Laundry", "Two Parking Spots", "Central AC", "Pool", "Gym"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    0.55,
    '2026-04-15',
    '12 months',
    'Cats allowed',
    true,
    false,
    'https://example.com/listing/weho-2br-21',
    'designdistrictliving@example.com',
    '(323) 555-1021',
    'Design District Living'
),
-- 22. Culver City 1BR
(
    'a0000001-0001-0001-0001-000000000022',
    'Modern 1BR Near Culver City Arts District',
    'Contemporary 1-bedroom in a new building near the Culver City Arts District. Clean lines, quartz counters, LVP flooring, and large windows. Walk to restaurants, galleries, and the Expo Line.',
    '9520 Washington Blvd, Culver City, CA 90232',
    'Culver City',
    2200.00,
    34.0211,
    -118.3964,
    1,
    1.0,
    720,
    '["New Construction", "Quartz Counters", "Near Transit", "Parking", "In-Unit Laundry"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    0.86,
    '2026-03-01',
    '12 months',
    'Dogs and cats allowed with $500 deposit and $50/month pet rent',
    true,
    false,
    'https://example.com/listing/cc-1br-22',
    'culvercitymodern@example.com',
    '(310) 555-1022',
    'Culver City Modern Living'
),
-- 23. Culver City 2BR
(
    'a0000001-0001-0001-0001-000000000023',
    'Family-Friendly 2BR Townhouse in Culver City',
    'Two-story townhouse with attached garage and small backyard. Two bedrooms upstairs, living/kitchen downstairs. Close to Sony Studios, restaurants on Culver Blvd, and great public schools.',
    '4015 Duquesne Ave, Culver City, CA 90232',
    'Culver City',
    3200.00,
    34.0159,
    -118.3910,
    2,
    1.5,
    1100,
    '["Townhouse", "Garage", "Backyard", "Two Stories", "Dishwasher", "Central AC"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.74,
    '2026-04-01',
    '12 months',
    'Dogs and cats allowed with $600 deposit',
    true,
    false,
    'https://example.com/listing/cc-2br-23',
    'duquesneprops@example.com',
    '(310) 555-1023',
    'Duquesne Properties'
),
-- 24. Culver City 3BR
(
    'a0000001-0001-0001-0001-000000000024',
    'Spacious 3BR House in Culver City',
    'Detached 3-bedroom house with large fenced yard, perfect for families or roommates. Remodeled kitchen with island, two full bathrooms, hardwood floors throughout, and a two-car garage.',
    '10825 Braddock Dr, Culver City, CA 90230',
    'Culver City',
    4800.00,
    34.0098,
    -118.3870,
    3,
    2.0,
    1600,
    '["House", "Fenced Yard", "Two-Car Garage", "Remodeled Kitchen", "Hardwood Floors", "Washer/Dryer"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    0.58,
    '2026-05-01',
    '12 months',
    'Pets welcome (no breed restrictions)',
    true,
    false,
    'https://example.com/listing/cc-3br-24',
    'braddockhomes@example.com',
    '(310) 555-1024',
    'Braddock Homes'
),
-- 25. Silver Lake 2BR (another)
(
    'a0000001-0001-0001-0001-000000000025',
    '2BR Hillside Home with Views in Silver Lake',
    'Perched on a Silver Lake hillside with sweeping views of the reservoir and downtown skyline. Two bedrooms, open-plan living, private deck, and direct access to the Silver Lake walking path.',
    '1667 Redesdale Ave, Los Angeles, CA 90026',
    'Silver Lake',
    3600.00,
    34.0880,
    -118.2710,
    2,
    1.0,
    1000,
    '["Reservoir Views", "Private Deck", "Open Floor Plan", "Near Walking Path", "Carport"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.63,
    '2026-04-15',
    '12 months',
    'Dogs allowed (under 35lbs)',
    true,
    false,
    'https://example.com/listing/sl-2br-25',
    'hillsiderentals@example.com',
    '(323) 555-1025',
    'Hillside Rentals'
),
-- 26. Los Feliz 3BR
(
    'a0000001-0001-0001-0001-000000000026',
    'Grand 3BR Craftsman Near Griffith Observatory',
    'Stately 3-bedroom craftsman with original woodwork, leaded glass windows, and a wraparound porch. Large fenced backyard with fruit trees. Walk to Griffith Observatory trails.',
    '2845 N Commonwealth Ave, Los Angeles, CA 90027',
    'Los Feliz',
    5000.00,
    34.1180,
    -118.2875,
    3,
    2.0,
    1800,
    '["Craftsman", "Wraparound Porch", "Fenced Backyard", "Fruit Trees", "Hardwood Floors", "Near Hiking", "Garage"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8'],
    0.50,
    '2026-05-01',
    '12 months',
    'Dogs and cats welcome',
    true,
    false,
    'https://example.com/listing/lf-3br-26',
    'commonwealthhomes@example.com',
    '(323) 555-1026',
    'Commonwealth Homes'
),
-- 27. Echo Park studio
(
    'a0000001-0001-0001-0001-000000000027',
    'Compact Studio Near Echo Park Lake',
    'Efficient studio with murphy bed near Echo Park Lake. Building has a rooftop with lake views. Great for anyone who works remotely or commutes downtown. Walking distance to Elysian Park.',
    '1400 W Sunset Blvd, Los Angeles, CA 90026',
    'Echo Park',
    1550.00,
    34.0778,
    -118.2575,
    0,
    1.0,
    380,
    '["Murphy Bed", "Rooftop Access", "Near Lake", "Shared Laundry", "Street Parking"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.93,
    '2026-02-28',
    '12 months',
    'No pets',
    false,
    false,
    'https://example.com/listing/ep-studio-27',
    'sunsetblvdapts@example.com',
    '(213) 555-1027',
    'Sunset Blvd Apartments'
),
-- 28. Venice furnished studio
(
    'a0000001-0001-0001-0001-000000000028',
    'Furnished Beach Studio in Venice',
    'Fully furnished studio three blocks from Venice Beach. Comes with quality furniture, kitchenware, linens, and a smart TV. Perfect for someone new to LA or short-term stays. Flexible lease available.',
    '615 Rose Ave, Venice, CA 90291',
    'Venice',
    2400.00,
    33.9920,
    -118.4695,
    0,
    1.0,
    480,
    '["Furnished", "Smart TV", "Beach Proximity", "Flexible Lease", "Bike Storage"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.81,
    '2026-03-01',
    '6-12 months',
    'No pets',
    false,
    true,
    'https://example.com/listing/ven-furn-28',
    'venicebeachpads@example.com',
    '(310) 555-1028',
    'Venice Beach Pads'
),
-- 29. West Hollywood furnished 2BR
(
    'a0000001-0001-0001-0001-000000000029',
    'Furnished 2BR Luxury Apt in West Hollywood',
    'Fully furnished luxury 2-bedroom with designer decor. Pool, spa, gym, and rooftop terrace with Hollywood Hills views. Walk to Melrose shopping, restaurants, and nightlife. Short or long-term lease.',
    '555 Santa Monica Blvd, West Hollywood, CA 90069',
    'West Hollywood',
    4200.00,
    34.0901,
    -118.3617,
    2,
    2.0,
    1050,
    '["Furnished", "Pool", "Spa", "Gym", "Rooftop Terrace", "Hills Views", "In-Unit Laundry", "Parking", "Pet Friendly"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750'],
    0.60,
    '2026-03-15',
    '6-12 months',
    'Cats allowed',
    true,
    true,
    'https://example.com/listing/weho-furn-29',
    'weholuxury@example.com',
    '(323) 555-1029',
    'WeHo Luxury Living'
),
-- 30. Highland Park 3BR
(
    'a0000001-0001-0001-0001-000000000030',
    'Charming 3BR Spanish Bungalow in Highland Park',
    'Beautiful Spanish-style bungalow on a tree-lined Highland Park street. Three bedrooms, original arched doorways, updated kitchen and bath, large front porch, and a detached workshop/studio in the backyard.',
    '5425 Aldama St, Los Angeles, CA 90042',
    'Highland Park',
    3500.00,
    34.1145,
    -118.1975,
    3,
    1.5,
    1400,
    '["Spanish Bungalow", "Front Porch", "Workshop/Studio", "Updated Kitchen", "Hardwood Floors", "Detached Garage"]'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    0.66,
    '2026-04-01',
    '12 months',
    'Dogs and cats welcome, fenced yard',
    true,
    false,
    'https://example.com/listing/hp-3br-30',
    'aldamarentals@example.com',
    '(323) 555-1030',
    'Aldama Rentals'
);

-- ==========================================
-- USER PREFERENCES (5 entries, one per user)
-- ==========================================
INSERT INTO user_preferences (
    id, user_id, max_budget, min_budget, min_bedrooms, max_bedrooms,
    min_bathrooms, max_bathrooms, neighborhoods, amenities,
    pet_friendly, parking_required, furnished_preference,
    lease_duration_months, max_commute_minutes, commute_address,
    commute_lat, commute_lon, move_in_date
) VALUES
(
    'b0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    3000, 1500, 1, 2, 1, 2,
    ARRAY['Santa Monica', 'Venice', 'Culver City'],
    ARRAY['Parking', 'Pet Friendly', 'In-Unit Laundry'],
    true, true, 'no_preference', 12, 30,
    '2425 Olympic Blvd, Santa Monica, CA 90404',
    34.0236, -118.4781,
    '2026-03-01'
),
(
    'b0000001-0001-0001-0001-000000000002',
    '22222222-2222-2222-2222-222222222222',
    2500, 1200, 0, 1, 1, 1,
    ARRAY['Downtown LA', 'Koreatown', 'Echo Park'],
    ARRAY['Near Metro', 'Central AC'],
    false, false, 'unfurnished', 12, 25,
    '300 S Grand Ave, Los Angeles, CA 90071',
    34.0505, -118.2551,
    '2026-03-01'
),
(
    'b0000001-0001-0001-0001-000000000003',
    '33333333-3333-3333-3333-333333333333',
    4500, 2500, 2, 3, 1, 2,
    ARRAY['West Hollywood', 'Los Feliz', 'Silver Lake'],
    ARRAY['Parking', 'Pool', 'Gym', 'Pet Friendly'],
    true, true, 'no_preference', 12, 40,
    '7060 Hollywood Blvd, Los Angeles, CA 90028',
    34.1016, -118.3365,
    '2026-04-01'
),
(
    'b0000001-0001-0001-0001-000000000004',
    '44444444-4444-4444-4444-444444444444',
    2000, 1200, 0, 1, 1, 1,
    ARRAY['Silver Lake', 'Highland Park', 'Echo Park'],
    ARRAY['Hardwood Floors', 'Natural Light'],
    false, false, 'unfurnished', 12, 35,
    '4700 N Figueroa St, Los Angeles, CA 90042',
    34.1073, -118.1942,
    '2026-03-01'
),
(
    'b0000001-0001-0001-0001-000000000005',
    '55555555-5555-5555-5555-555555555555',
    3500, 2000, 2, 2, 1, 2,
    ARRAY['Culver City', 'Mar Vista', 'Palms'],
    ARRAY['Parking', 'Pet Friendly', 'Dishwasher', 'Washer/Dryer'],
    true, true, 'unfurnished', 12, 30,
    '10202 Washington Blvd, Culver City, CA 90232',
    34.0158, -118.4032,
    '2026-03-15'
);

-- ==========================================
-- SEARCHES (5 search history entries)
-- ==========================================
INSERT INTO searches (id, user_id, query_text, filters, results_count) VALUES
(
    'c0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '2 bedroom pet-friendly apartment in Santa Monica under $3000',
    '{"min_bedrooms": 2, "max_price": 3000, "neighborhoods": ["Santa Monica"], "pet_friendly": true}'::jsonb,
    4
),
(
    'c0000001-0001-0001-0001-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'Affordable studio near downtown LA metro',
    '{"max_bedrooms": 0, "max_price": 2000, "neighborhoods": ["Downtown LA", "Koreatown"], "near_transit": true}'::jsonb,
    6
),
(
    'c0000001-0001-0001-0001-000000000003',
    '33333333-3333-3333-3333-333333333333',
    'Spacious apartment with pool and parking in West Hollywood',
    '{"min_bedrooms": 2, "max_price": 4500, "neighborhoods": ["West Hollywood"], "amenities": ["Pool", "Parking"]}'::jsonb,
    3
),
(
    'c0000001-0001-0001-0001-000000000004',
    '44444444-4444-4444-4444-444444444444',
    'Cheap studio or 1BR in Silver Lake or Highland Park',
    '{"max_bedrooms": 1, "max_price": 1800, "neighborhoods": ["Silver Lake", "Highland Park"]}'::jsonb,
    5
),
(
    'c0000001-0001-0001-0001-000000000005',
    '55555555-5555-5555-5555-555555555555',
    '2BR with yard or outdoor space in Culver City for a family with dog',
    '{"min_bedrooms": 2, "max_price": 3500, "neighborhoods": ["Culver City"], "pet_friendly": true, "amenities": ["Backyard"]}'::jsonb,
    3
);

-- ==========================================
-- LISTING SCORES (10 entries)
-- ==========================================
INSERT INTO listing_scores (
    id, listing_id, user_id, search_id,
    overall_score, price_score, location_score, size_score,
    amenities_score, commute_score, availability_score,
    reasoning, pros, cons
) VALUES
-- John scoring Santa Monica apartments
(
    'd0000001-0001-0001-0001-000000000001',
    'a0000001-0001-0001-0001-000000000005', -- SM studio
    '11111111-1111-1111-1111-111111111111',
    'c0000001-0001-0001-0001-000000000001',
    72, 80, 90, 50, 75, 85, 90,
    'Good location and price for Santa Monica but studio is too small for the stated 2BR preference. Great beach proximity and amenities.',
    ARRAY['Excellent beach proximity', 'Within budget', 'Has parking and laundry', 'High availability'],
    ARRAY['Studio, not 2BR as preferred', 'No pet policy for dogs', 'Small square footage']
),
(
    'd0000001-0001-0001-0001-000000000002',
    'a0000001-0001-0001-0001-000000000007', -- SM 2BR condo
    '11111111-1111-1111-1111-111111111111',
    'c0000001-0001-0001-0001-000000000001',
    65, 40, 95, 85, 90, 80, 60,
    'Perfect size and location but over budget at $4200. No pets allowed is a dealbreaker. Excellent amenities package.',
    ARRAY['Perfect 2BR size', 'Ocean views', 'Pool and two parking spots', 'Walk to beach'],
    ARRAY['Over budget by $1200', 'No pets allowed', 'Lower availability score']
),
-- Jane scoring DTLA/Koreatown apartments
(
    'd0000001-0001-0001-0001-000000000003',
    'a0000001-0001-0001-0001-000000000010', -- DTLA studio
    '22222222-2222-2222-2222-222222222222',
    'c0000001-0001-0001-0001-000000000002',
    88, 85, 90, 70, 85, 95, 90,
    'Excellent match for a young professional wanting DTLA living. Good price, amazing amenities, and very short commute. Studio size is fine for stated preferences.',
    ARRAY['Under budget', 'Walking distance to work', 'Pool, gym, and co-working', 'Arts District lifestyle'],
    ARRAY['Studio (no separate bedroom)', 'Dog deposit required', 'Concrete floors may feel cold']
),
(
    'd0000001-0001-0001-0001-000000000004',
    'a0000001-0001-0001-0001-000000000017', -- K-Town studio
    '22222222-2222-2222-2222-222222222222',
    'c0000001-0001-0001-0001-000000000002',
    91, 95, 80, 60, 70, 85, 95,
    'Best value option at $1500. Near Metro for easy commute. Koreatown has incredible food and nightlife. Small but efficient.',
    ARRAY['Lowest price at $1500', 'Near Metro Purple Line', 'Incredible neighborhood dining', 'Gated parking available', 'Very high availability'],
    ARRAY['Smallest unit at 400 sqft', 'No pets', 'No in-unit laundry']
),
(
    'd0000001-0001-0001-0001-000000000005',
    'a0000001-0001-0001-0001-000000000018', -- K-Town 1BR
    '22222222-2222-2222-2222-222222222222',
    'c0000001-0001-0001-0001-000000000002',
    85, 80, 80, 75, 80, 82, 88,
    'Great renovated 1BR within budget. Underground parking is a nice bonus. Cats allowed if preferences change. Good commute via Metro.',
    ARRAY['Recently renovated', 'Within budget', 'Underground parking', 'Cats allowed'],
    ARRAY['Slightly above minimum budget preference', 'Not directly on Metro', 'No in-unit laundry']
),
-- Mike scoring WeHo/Los Feliz apartments
(
    'd0000001-0001-0001-0001-000000000006',
    'a0000001-0001-0001-0001-000000000021', -- WeHo 2BR luxury
    '33333333-3333-3333-3333-333333333333',
    'c0000001-0001-0001-0001-000000000003',
    82, 70, 90, 80, 95, 75, 55,
    'Luxury finishes match expectations but price is at the top of budget. Excellent amenities with pool and gym. Cats only is limiting for dog owners.',
    ARRAY['Designer finishes', 'Pool, gym, in-unit laundry', 'Walk to Design District', 'Two parking spots'],
    ARRAY['At budget ceiling of $4500', 'Cats only, no dogs', 'Not available until April 15', 'Low availability score']
),
(
    'd0000001-0001-0001-0001-000000000007',
    'a0000001-0001-0001-0001-000000000016', -- Los Feliz 2BR
    '33333333-3333-3333-3333-333333333333',
    'c0000001-0001-0001-0001-000000000003',
    87, 82, 85, 80, 75, 80, 68,
    'Beautiful Spanish-style architecture near Griffith Park. Dogs and cats allowed with deposit. Garage parking. Good value for Los Feliz.',
    ARRAY['Stunning Spanish architecture', 'Dogs and cats allowed', 'Garage parking', 'Near Griffith Park hiking'],
    ARRAY['Only 1 bathroom for 2BR', 'No pool or gym', 'Not available until April']
),
-- Sarah scoring Silver Lake/Highland Park
(
    'd0000001-0001-0001-0001-000000000008',
    'a0000001-0001-0001-0001-000000000001', -- SL studio
    '44444444-4444-4444-4444-444444444444',
    'c0000001-0001-0001-0001-000000000004',
    86, 80, 90, 65, 60, 80, 92,
    'Great price at $1750 for Silver Lake. Reservoir views are a bonus. No pets or parking aligns with stated no-pet preference. Small but functional.',
    ARRAY['Under budget at $1750', 'Silver Lake Reservoir views', 'High availability', 'Walk to cafes and market'],
    ARRAY['Studio, no separate bedroom', 'Only shared laundry', 'No parking (street only)', 'Only 480 sqft']
),
(
    'd0000001-0001-0001-0001-000000000009',
    'a0000001-0001-0001-0001-000000000013', -- HP 1BR cottage
    '44444444-4444-4444-4444-444444444444',
    'c0000001-0001-0001-0001-000000000004',
    93, 90, 85, 75, 70, 95, 91,
    'Best match overall: within budget, 1BR with private patio, very close to work commute address. Remodeled and clean. Cats allowed if ever wanted.',
    ARRAY['Under budget at $1800', 'Private patio', 'Remodeled', 'Excellent commute', 'High availability'],
    ARRAY['Highland Park not Silver Lake', 'Cats only (no dogs)', 'Limited amenities']
),
-- Carlos scoring Culver City
(
    'd0000001-0001-0001-0001-000000000010',
    'a0000001-0001-0001-0001-000000000023', -- CC 2BR townhouse
    '55555555-5555-5555-5555-555555555555',
    'c0000001-0001-0001-0001-000000000005',
    89, 78, 90, 80, 80, 90, 74,
    'Excellent family-friendly townhouse with garage and backyard for the dog. Within budget. Two stories provide nice separation. Close to good schools and Sony Studios.',
    ARRAY['Backyard for dog', 'Garage parking', 'Two stories', 'Family-friendly neighborhood', 'Good schools nearby'],
    ARRAY['1.5 bath (would prefer 2)', 'Not available until April', 'No in-unit washer/dryer', 'Slightly under 2BR size preference']
);

-- ==========================================
-- COST ESTIMATES (5 entries)
-- ==========================================
INSERT INTO cost_estimates (
    id, user_id, listing_id,
    first_month_rent, last_month_rent, security_deposit, pet_deposit,
    application_fee, broker_fee, move_in_total,
    monthly_rent, utilities_estimate, parking_fee, pet_rent,
    renters_insurance, monthly_total,
    moving_company_quote, packing_materials, storage_costs, travel_costs, moving_total,
    estimate_notes
) VALUES
(
    'e0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'a0000001-0001-0001-0001-000000000005', -- SM studio
    2200, 2200, 2200, 300, 50, 0, 6950,
    2200, 180, 0, 0, 25, 2405,
    1200, 100, 0, 50, 1350,
    'Estimate for SM studio. Utilities include LADWP electric (~$100), SoCalGas (~$40), internet (~$40). Parking included. Pet deposit for cat. Moving from within LA, local move.'
),
(
    'e0000001-0001-0001-0001-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'a0000001-0001-0001-0001-000000000017', -- K-Town studio
    1500, 1500, 1500, 0, 45, 0, 4545,
    1500, 150, 100, 0, 20, 1770,
    800, 75, 0, 0, 875,
    'Estimate for Koreatown studio. Very affordable move-in. Utilities lower due to small unit. Parking is additional $100/month. No pet costs. Local move.'
),
(
    'e0000001-0001-0001-0001-000000000003',
    '33333333-3333-3333-3333-333333333333',
    'a0000001-0001-0001-0001-000000000021', -- WeHo 2BR luxury
    4500, 4500, 4500, 0, 75, 0, 13575,
    4500, 220, 0, 0, 35, 4755,
    1800, 150, 200, 100, 2250,
    'Estimate for WeHo luxury 2BR. High move-in costs due to rent level. Utilities higher for larger unit. Two parking spots included. Storage for transition period. Moving from out of state.'
),
(
    'e0000001-0001-0001-0001-000000000004',
    '44444444-4444-4444-4444-444444444444',
    'a0000001-0001-0001-0001-000000000013', -- HP 1BR cottage
    1800, 1800, 1800, 0, 40, 0, 5440,
    1800, 160, 0, 0, 20, 1980,
    900, 80, 0, 0, 980,
    'Estimate for Highland Park 1BR cottage. Very affordable total. Parking included (off-street). No pet costs. Utilities moderate. Simple local move.'
),
(
    'e0000001-0001-0001-0001-000000000005',
    '55555555-5555-5555-5555-555555555555',
    'a0000001-0001-0001-0001-000000000023', -- CC 2BR townhouse
    3200, 3200, 3200, 600, 50, 0, 10250,
    3200, 200, 0, 50, 30, 3480,
    1500, 120, 0, 75, 1695,
    'Estimate for Culver City 2BR townhouse. Garage included so no extra parking. Pet deposit $600 + $50/month pet rent. Utilities include electric, gas, water, internet. Moving with furniture.'
);

-- ==========================================
-- FAVORITES (varied favorites across users)
-- ==========================================
INSERT INTO favorites (user_id, apartment_id, notes) VALUES
('11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000005', 'Love the beach proximity and rooftop!'),
('11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000009', 'Perfect size, dog-friendly, Venice vibes'),
('11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000022', 'Good Culver City option, near Expo Line'),
('22222222-2222-2222-2222-222222222222', 'a0000001-0001-0001-0001-000000000017', 'Best price, close to everything in K-Town'),
('22222222-2222-2222-2222-222222222222', 'a0000001-0001-0001-0001-000000000010', 'Love the Arts District warehouse vibe'),
('33333333-3333-3333-3333-333333333333', 'a0000001-0001-0001-0001-000000000016', 'Beautiful Spanish style near Griffith Park'),
('33333333-3333-3333-3333-333333333333', 'a0000001-0001-0001-0001-000000000021', 'Luxury finishes, great amenities'),
('44444444-4444-4444-4444-444444444444', 'a0000001-0001-0001-0001-000000000001', 'Reservoir views, great location'),
('44444444-4444-4444-4444-444444444444', 'a0000001-0001-0001-0001-000000000013', 'Top choice - cottage is so charming'),
('55555555-5555-5555-5555-555555555555', 'a0000001-0001-0001-0001-000000000023', 'Townhouse with yard for the dog!'),
('55555555-5555-5555-5555-555555555555', 'a0000001-0001-0001-0001-000000000024', 'Dream house, but might be over budget');

-- ==========================================
-- APPOINTMENTS (3 appointments)
-- ==========================================
INSERT INTO appointments (id, user_id, apartment_id, scheduled_time, status, notes, reminder_sent) VALUES
(
    'f0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'a0000001-0001-0001-0001-000000000009', -- Venice 2BR
    '2026-02-25 14:00:00-08',
    'confirmed',
    'Looking forward to seeing the rooftop deck and checking the area for dog walking',
    false
),
(
    'f0000001-0001-0001-0001-000000000002',
    '44444444-4444-4444-4444-444444444444',
    'a0000001-0001-0001-0001-000000000013', -- HP 1BR cottage
    '2026-02-27 10:30:00-08',
    'pending',
    'Want to see the private patio and check the neighborhood vibe',
    false
),
(
    'f0000001-0001-0001-0001-000000000003',
    '55555555-5555-5555-5555-555555555555',
    'a0000001-0001-0001-0001-000000000023', -- CC 2BR townhouse
    '2026-03-01 11:00:00-08',
    'pending',
    'Need to check if yard is fully fenced and measure rooms for furniture',
    false
);

-- ==========================================
-- MESSAGES (sample user-to-user messages)
-- ==========================================
INSERT INTO messages (sender_id, recipient_id, apartment_id, subject, content) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'a0000001-0001-0001-0001-000000000010',
    'Question about the DTLA Arts District studio',
    'Hi! I noticed you saved the same Arts District studio. Have you visited it yet? Wondering if the neighborhood feels safe at night.'
),
(
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'a0000001-0001-0001-0001-000000000010',
    'RE: Question about the DTLA Arts District studio',
    'Hey! Yes, I visited last week. The area is well-lit and there are always people around from the restaurants. Felt very safe. The unit itself is great!'
);

-- ==========================================
-- CHATS (AI agent chat sessions)
-- ==========================================
INSERT INTO chats (id, user_id, agent_type, title, messages, metadata) VALUES
(
    'g0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'search',
    'Pet-friendly apartments near the beach',
    '[
        {"role": "user", "content": "I need a 2-bedroom apartment that allows dogs, preferably near the beach in Santa Monica or Venice", "timestamp": "2026-02-18T10:00:00Z"},
        {"role": "assistant", "content": "I will search for dog-friendly 2BR apartments in Santa Monica and Venice. What is your budget range?", "timestamp": "2026-02-18T10:00:05Z"},
        {"role": "user", "content": "Around $3000-3500 per month. I also need parking.", "timestamp": "2026-02-18T10:00:30Z"},
        {"role": "assistant", "content": "I found 4 apartments matching your criteria. The top match is a 2BR in Venice at $3500 with a rooftop deck and dog-friendly policy. Would you like to see the full details?", "timestamp": "2026-02-18T10:01:00Z"}
    ]'::jsonb,
    '{"search_criteria": {"location": ["Santa Monica", "Venice"], "bedrooms": 2, "max_price": 3500, "pet_friendly": true, "parking": true}, "results_shown": 4}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000002',
    '44444444-4444-4444-4444-444444444444',
    'search',
    'Budget apartments in Eastside LA',
    '[
        {"role": "user", "content": "I am looking for the cheapest studio or 1BR I can find in Silver Lake or Highland Park", "timestamp": "2026-02-19T14:00:00Z"},
        {"role": "assistant", "content": "I will search for affordable studios and 1-bedrooms in Silver Lake and Highland Park. These neighborhoods have a nice range of options. What is the maximum you can spend?", "timestamp": "2026-02-19T14:00:05Z"},
        {"role": "user", "content": "No more than $1800 per month", "timestamp": "2026-02-19T14:00:20Z"},
        {"role": "assistant", "content": "I found 5 options under $1800. The best value is a 1BR cottage in Highland Park at $1800 with a private patio and remodeled interior. There is also a cozy Silver Lake studio at $1750 with reservoir views. Want me to score these based on your preferences?", "timestamp": "2026-02-19T14:00:45Z"}
    ]'::jsonb,
    '{"search_criteria": {"location": ["Silver Lake", "Highland Park"], "max_bedrooms": 1, "max_price": 1800}, "results_shown": 5}'::jsonb
);

-- ==========================================
-- CHAT MESSAGES (individual messages for relational querying)
-- ==========================================
INSERT INTO chat_messages (chat_id, user_id, role, content, metadata) VALUES
(
    'g0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'user',
    'I need a 2-bedroom apartment that allows dogs, preferably near the beach in Santa Monica or Venice',
    '{}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'assistant',
    'I will search for dog-friendly 2BR apartments in Santa Monica and Venice. What is your budget range?',
    '{"agent": "orchestrator", "delegated_to": "market_researcher"}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'user',
    'Around $3000-3500 per month. I also need parking.',
    '{}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'assistant',
    'I found 4 apartments matching your criteria. The top match is a 2BR in Venice at $3500 with a rooftop deck and dog-friendly policy. Would you like to see the full details?',
    '{"agent": "orchestrator", "results_count": 4, "top_match_id": "a0000001-0001-0001-0001-000000000009"}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000002',
    '44444444-4444-4444-4444-444444444444',
    'user',
    'I am looking for the cheapest studio or 1BR I can find in Silver Lake or Highland Park',
    '{}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000002',
    '44444444-4444-4444-4444-444444444444',
    'assistant',
    'I will search for affordable studios and 1-bedrooms in Silver Lake and Highland Park. These neighborhoods have a nice range of options. What is the maximum you can spend?',
    '{"agent": "orchestrator", "delegated_to": "market_researcher"}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000002',
    '44444444-4444-4444-4444-444444444444',
    'user',
    'No more than $1800 per month',
    '{}'::jsonb
),
(
    'g0000001-0001-0001-0001-000000000002',
    '44444444-4444-4444-4444-444444444444',
    'assistant',
    'I found 5 options under $1800. The best value is a 1BR cottage in Highland Park at $1800 with a private patio and remodeled interior. There is also a cozy Silver Lake studio at $1750 with reservoir views. Want me to score these based on your preferences?',
    '{"agent": "orchestrator", "results_count": 5, "top_match_id": "a0000001-0001-0001-0001-000000000013"}'::jsonb
);

-- ==========================================
-- COMMUNICATIONS (outbound contacts)
-- ==========================================
INSERT INTO communications (
    id, user_id, apartment_id, type, subject, body,
    recipient_email, recipient_phone, status, metadata
) VALUES
(
    'h0000001-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'a0000001-0001-0001-0001-000000000009', -- Venice 2BR
    'email',
    'Inquiry about 2BR at 89 Windward Ave, Venice',
    'Hello, I am interested in the 2-bedroom apartment at 89 Windward Ave. I have a well-behaved 30lb dog and am looking to move in late February. Could I schedule a viewing this week? Thank you, John Doe',
    'windwardrealty@example.com',
    NULL,
    'sent',
    '{"sent_at": "2026-02-18T15:00:00Z", "template": "initial_inquiry"}'::jsonb
),
(
    'h0000001-0001-0001-0001-000000000002',
    '44444444-4444-4444-4444-444444444444',
    'a0000001-0001-0001-0001-000000000013', -- HP 1BR cottage
    'email',
    'Interested in 1BR cottage at 5120 Monte Vista St',
    'Hi, I saw the listing for the 1BR cottage on Monte Vista. It looks perfect for me. Is it still available? I can be flexible on move-in date. Best, Sarah Lee',
    'hprentals@example.com',
    NULL,
    'delivered',
    '{"sent_at": "2026-02-19T16:00:00Z", "delivered_at": "2026-02-19T16:00:12Z", "template": "initial_inquiry"}'::jsonb
),
(
    'h0000001-0001-0001-0001-000000000003',
    '44444444-4444-4444-4444-444444444444',
    'a0000001-0001-0001-0001-000000000013', -- HP 1BR cottage
    'sms',
    NULL,
    'Hi, this is Sarah Lee. I emailed about the 1BR cottage on Monte Vista. Is it still available for a March move-in? Thanks!',
    NULL,
    '(323) 555-1013',
    'delivered',
    '{"sent_at": "2026-02-20T10:00:00Z", "delivered_at": "2026-02-20T10:00:03Z", "template": "follow_up_sms"}'::jsonb
),
(
    'h0000001-0001-0001-0001-000000000004',
    '55555555-5555-5555-5555-555555555555',
    'a0000001-0001-0001-0001-000000000023', -- CC 2BR townhouse
    'email',
    'Viewing request: 2BR Townhouse at 4015 Duquesne Ave',
    'Hello, my family and I are very interested in the 2BR townhouse at 4015 Duquesne Ave. We have a friendly golden retriever. Could we schedule a viewing for early March? We are looking for a March or April move-in. Thanks, Carlos Garcia',
    'duquesneprops@example.com',
    NULL,
    'sent',
    '{"sent_at": "2026-02-20T11:00:00Z", "template": "initial_inquiry"}'::jsonb
),
(
    'h0000001-0001-0001-0001-000000000005',
    '55555555-5555-5555-5555-555555555555',
    'a0000001-0001-0001-0001-000000000023', -- CC 2BR townhouse
    'call',
    NULL,
    'Called to confirm viewing appointment for March 1st at 11am. Spoke with property manager, confirmed the yard is fully fenced and dogs are welcome.',
    NULL,
    '(310) 555-1023',
    'delivered',
    '{"sent_at": "2026-02-20T14:00:00Z", "call_duration_seconds": 180, "outcome": "appointment_confirmed"}'::jsonb
);

-- ==========================================
-- VERIFICATION
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '=== Seed Data Summary ===';
    RAISE NOTICE 'Users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Apartments: %', (SELECT COUNT(*) FROM apartments);
    RAISE NOTICE 'User Preferences: %', (SELECT COUNT(*) FROM user_preferences);
    RAISE NOTICE 'Searches: %', (SELECT COUNT(*) FROM searches);
    RAISE NOTICE 'Listing Scores: %', (SELECT COUNT(*) FROM listing_scores);
    RAISE NOTICE 'Cost Estimates: %', (SELECT COUNT(*) FROM cost_estimates);
    RAISE NOTICE 'Favorites: %', (SELECT COUNT(*) FROM favorites);
    RAISE NOTICE 'Appointments: %', (SELECT COUNT(*) FROM appointments);
    RAISE NOTICE 'Messages: %', (SELECT COUNT(*) FROM messages);
    RAISE NOTICE 'Chats: %', (SELECT COUNT(*) FROM chats);
    RAISE NOTICE 'Chat Messages: %', (SELECT COUNT(*) FROM chat_messages);
    RAISE NOTICE 'Communications: %', (SELECT COUNT(*) FROM communications);
END $$;
