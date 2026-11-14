BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL CHECK (length(btrim(full_name)) > 0),
    email text NOT NULL CHECK (length(btrim(email)) > 3),
    password_hash text NOT NULL,
    phone text,
    country text,
    avatar_image_id text,
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq
    ON users (lower(email));

CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_active_idx
    ON user_sessions (user_id, expires_at DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx
    ON user_sessions (expires_at);

CREATE TABLE IF NOT EXISTS destinations (
    id text PRIMARY KEY,
    name text NOT NULL,
    country text NOT NULL,
    category text NOT NULL,
    starting_price numeric(12, 2) NOT NULL CHECK (starting_price >= 0),
    average_rating numeric(3, 2) CHECK (average_rating BETWEEN 0 AND 5),
    review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    tag text,
    image_id text NOT NULL,
    description text NOT NULL,
    latitude double precision CHECK (latitude BETWEEN -90 AND 90),
    longitude double precision CHECK (longitude BETWEEN -180 AND 180),
    attractions jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(attractions) = 'array'),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
    id text PRIMARY KEY,
    destination_id text NOT NULL
        REFERENCES destinations (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    title text NOT NULL,
    duration_days integer NOT NULL CHECK (duration_days > 0),
    price_per_person numeric(12, 2) NOT NULL CHECK (price_per_person >= 0),
    date_label text NOT NULL,
    trip_type text NOT NULL,
    image_id text NOT NULL,
    included_items jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(included_items) = 'array'),
    excluded_items jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(excluded_items) = 'array'),
    itinerary jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(itinerary) = 'array'),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trips_destination_id_idx
    ON trips (destination_id);

CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference text NOT NULL UNIQUE,
    user_id uuid REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    trip_id text NOT NULL
        REFERENCES trips (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    travel_date date NOT NULL,
    guests integer NOT NULL CHECK (guests BETWEEN 1 AND 20),
    traveller_name text NOT NULL CHECK (length(btrim(traveller_name)) > 0),
    email text NOT NULL CHECK (length(btrim(email)) > 3),
    phone text NOT NULL CHECK (length(btrim(phone)) > 0),
    currency char(3) NOT NULL DEFAULT 'USD',
    price_per_person numeric(12, 2) NOT NULL CHECK (price_per_person >= 0),
    subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount numeric(12, 2) NOT NULL DEFAULT 0
        CHECK (discount_amount >= 0),
    total numeric(12, 2) NOT NULL CHECK (total >= 0),
    coupon_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bookings_total_matches_breakdown
        CHECK (total = subtotal + tax_amount - discount_amount)
);

CREATE INDEX IF NOT EXISTS bookings_user_created_idx
    ON bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_trip_date_idx
    ON bookings (trip_id, travel_date);

CREATE TABLE IF NOT EXISTS favorites (
    user_id uuid NOT NULL
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
    destination_id text NOT NULL
        REFERENCES destinations (id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, destination_id)
);

CREATE INDEX IF NOT EXISTS favorites_destination_id_idx
    ON favorites (destination_id);

CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
    destination_id text REFERENCES destinations (id) ON DELETE CASCADE,
    trip_id text REFERENCES trips (id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title text,
    body text NOT NULL CHECK (length(btrim(body)) > 0),
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reviews_one_subject CHECK (
        (destination_id IS NOT NULL AND trip_id IS NULL)
        OR (destination_id IS NULL AND trip_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_destination_uq
    ON reviews (user_id, destination_id)
    WHERE destination_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_trip_uq
    ON reviews (user_id, trip_id)
    WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reviews_published_destination_idx
    ON reviews (destination_id, created_at DESC)
    WHERE is_published AND destination_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reviews_published_trip_idx
    ON reviews (trip_id, created_at DESC)
    WHERE is_published AND trip_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    source text NOT NULL DEFAULT 'website',
    subscribed_at timestamptz NOT NULL DEFAULT now(),
    unsubscribed_at timestamptz,
    CONSTRAINT newsletter_unsubscribe_state CHECK (
        (is_active AND unsubscribed_at IS NULL)
        OR (NOT is_active AND unsubscribed_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_lower_uq
    ON newsletter_subscribers (lower(email));

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS destinations_set_updated_at ON destinations;
CREATE TRIGGER destinations_set_updated_at
    BEFORE UPDATE ON destinations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trips_set_updated_at ON trips;
CREATE TRIGGER trips_set_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
