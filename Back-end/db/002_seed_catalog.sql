BEGIN;

INSERT INTO destinations (
    id, name, country, category, starting_price, average_rating,
    review_count, tag, image_id, description, latitude, longitude, attractions
) VALUES
(
    'maldives', 'The Maldives', 'Maldives', 'Beach', 2890, 4.98, 324,
    'Island escape', 'photo-1514282401047-d79a71a590e8',
    'A necklace of coral islands where overwater villas, turquoise lagoons and slow days set the pace.',
    4.17521, 73.50916,
    '["North Malé Atoll", "Baa Atoll Biosphere Reserve", "Sunset dolphin cruise"]'::jsonb
),
(
    'switzerland', 'Swiss Alps', 'Switzerland', 'Adventure', 2140, 4.95, 218,
    'Mountain air', 'photo-1531366936337-7c912a4589a7',
    'Alpine villages, dramatic peaks and panoramic rail journeys make every turn unforgettable.',
    46.5592, 8.5614,
    '["Jungfraujoch", "Lauterbrunnen Valley", "Lake Brienz"]'::jsonb
),
(
    'bali', 'Bali', 'Indonesia', 'Nature', 1680, 4.91, 412,
    'Tropical calm', 'photo-1537996194471-e657df975ab4',
    'Find your rhythm among emerald rice terraces, soulful temples and warm island hospitality.',
    -8.4095, 115.1889,
    '["Ubud rice terraces", "Uluwatu Temple", "Mount Batur"]'::jsonb
),
(
    'paris', 'Paris', 'France', 'Cultural', 1950, 4.89, 278,
    'City of light', 'photo-1502602898657-3e91760cbb34',
    'An effortless blend of grand boulevards, intimate cafés, remarkable art and timeless style.',
    48.8566, 2.3522,
    '["Eiffel Tower", "Musée d’Orsay", "Le Marais"]'::jsonb
),
(
    'egypt', 'Egypt & Red Sea', 'Egypt', 'Cultural', 1370, 4.92, 186,
    'Ancient wonders', 'photo-1539768942893-daf53e448371',
    'Trace the stories of ancient Egypt, then unwind beside the clear reefs of the Red Sea.',
    27.2579, 33.8116,
    '["Pyramids of Giza", "Luxor Temple", "Giftun Island"]'::jsonb
),
(
    'amalfi', 'Amalfi Coast', 'Italy', 'Luxury', 2460, 4.96, 193,
    'Coastal living', 'photo-1533587851505-d119e13fa0d7',
    'Cliffside villages, private boat days and long lunches above the deep blue Mediterranean.',
    40.6337, 14.6026,
    '["Positano", "Ravello gardens", "Capri by boat"]'::jsonb
),
(
    'santorini', 'Santorini', 'Greece', 'Luxury', 2250, 4.94, 206,
    'Aegean light', 'photo-1533105079780-92b9be482077',
    'Whitewashed lanes, volcanic cliffs and the Aegean at golden hour.',
    36.4057, 25.4568,
    '["Oia village", "Akrotiri", "Caldera sailing"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    category = EXCLUDED.category,
    starting_price = EXCLUDED.starting_price,
    average_rating = EXCLUDED.average_rating,
    review_count = EXCLUDED.review_count,
    tag = EXCLUDED.tag,
    image_id = EXCLUDED.image_id,
    description = EXCLUDED.description,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    attractions = EXCLUDED.attractions,
    is_active = true;

INSERT INTO trips (
    id, destination_id, title, duration_days, price_per_person,
    date_label, trip_type, image_id, included_items, excluded_items, itinerary
) VALUES
(
    'maldives-retreat', 'maldives', 'Private Island Retreat', 7, 2890,
    'Year round', 'Luxury', 'photo-1540202404-a2f29016b523',
    '["Six nights in an overwater villa", "Daily breakfast", "Seaplane transfers", "Sunset sailing"]'::jsonb,
    '["International flights", "Travel insurance"]'::jsonb,
    '["Arrive in Malé and transfer by seaplane", "Lagoon day and private snorkelling", "Sunset sail and island dinner"]'::jsonb
),
(
    'alpine-rail', 'switzerland', 'Alpine Rail & Lakes', 6, 2140,
    'May – October', 'Adventure', 'photo-1500530855697-b586d89ba3ee',
    '["Boutique hotel stays", "Scenic rail pass", "Daily breakfast", "Local guide"]'::jsonb,
    '["International flights", "Lunch and dinner"]'::jsonb,
    '["Arrive in Zürich", "Ride to the Jungfrau region", "Lake cruise and village walk"]'::jsonb
),
(
    'bali-soul', 'bali', 'Bali, Slowly', 8, 1680,
    'Year round', 'Nature', 'photo-1518548419970-58e3b4079ab2',
    '["Seven nights boutique stay", "Airport transfers", "Temple and rice terrace tour", "Daily breakfast"]'::jsonb,
    '["International flights", "Personal expenses"]'::jsonb,
    '["Welcome to Ubud", "Rice terrace and temple visit", "Coast and sunset at Uluwatu"]'::jsonb
),
(
    'paris-weekend', 'paris', 'A Parisian Long Weekend', 4, 1950,
    'Year round', 'Cultural', 'photo-1499856871958-5b9627545d1a',
    '["Three nights in a design hotel", "Museum entry", "Breakfast", "Seine evening cruise"]'::jsonb,
    '["Flights", "Meals not listed"]'::jsonb,
    '["Check in and neighbourhood stroll", "Private art walk", "Seine cruise and farewell dinner"]'::jsonb
),
(
    'egypt-discovery', 'egypt', 'Nile to Red Sea', 8, 1370,
    'October – April', 'Cultural', 'photo-1548013146-72479768bada',
    '["Cairo and Luxor hotels", "Expert Egyptologist guide", "Domestic transfer", "Red Sea stay"]'::jsonb,
    '["International flights", "Visa fees"]'::jsonb,
    '["Giza plateau", "Luxor temples", "Red Sea reef escape"]'::jsonb
),
(
    'amalfi-coast', 'amalfi', 'Amalfi by Sea', 6, 2460,
    'April – October', 'Luxury', 'photo-1516483638261-f4dbaf036963',
    '["Sea-view hotel", "Private boat day", "Breakfast", "Coast transfers"]'::jsonb,
    '["Flights", "Some meals"]'::jsonb,
    '["Arrive in Positano", "Private boat to Capri", "Ravello gardens"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    destination_id = EXCLUDED.destination_id,
    title = EXCLUDED.title,
    duration_days = EXCLUDED.duration_days,
    price_per_person = EXCLUDED.price_per_person,
    date_label = EXCLUDED.date_label,
    trip_type = EXCLUDED.trip_type,
    image_id = EXCLUDED.image_id,
    included_items = EXCLUDED.included_items,
    excluded_items = EXCLUDED.excluded_items,
    itinerary = EXCLUDED.itinerary,
    is_active = true;

COMMIT;
