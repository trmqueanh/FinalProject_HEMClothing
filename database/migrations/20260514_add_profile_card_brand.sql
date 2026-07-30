ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS card_brand VARCHAR(30) NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_card_brand_check'
      AND conrelid = 'user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_card_brand_check
    CHECK (card_brand IN ('visa', 'mastercard', ''));
  END IF;
END $$;
