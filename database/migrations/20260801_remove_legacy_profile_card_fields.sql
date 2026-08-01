ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS card_holder_name,
  DROP COLUMN IF EXISTS card_last4,
  DROP COLUMN IF EXISTS card_brand;
