BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS avatar_data_url text;

COMMIT;
