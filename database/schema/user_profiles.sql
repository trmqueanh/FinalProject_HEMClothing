CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    gender VARCHAR(20) NOT NULL DEFAULT '',
    birth_date DATE,
    avatar_url TEXT NOT NULL DEFAULT '',
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'cod',
    card_holder_name VARCHAR(120) NOT NULL DEFAULT '',
    card_last4 VARCHAR(4) NOT NULL DEFAULT '',
    card_brand VARCHAR(30) NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT user_profiles_gender_check
      CHECK (gender IN ('male', 'female', 'other', '')),
    CONSTRAINT user_profiles_payment_provider_check
      CHECK (payment_provider IN ('cod', 'bank_transfer')),
    CONSTRAINT user_profiles_card_last4_check
      CHECK (card_last4 ~ '^[0-9]{0,4}$'),
    CONSTRAINT user_profiles_card_brand_check
      CHECK (card_brand IN ('visa', 'mastercard', '')),
    CONSTRAINT user_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_key
ON user_profiles(user_id);
