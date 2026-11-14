BEGIN;

-- Neon Auth owns password credentials. The app's profile table stores only
-- the matching auth user ID and non-secret profile fields.
ALTER TABLE public.users
    ALTER COLUMN password_hash DROP NOT NULL;

COMMIT;
