CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    receiver_name VARCHAR(120) NOT NULL DEFAULT '',
    receiver_phone VARCHAR(30) NOT NULL DEFAULT '',
    country VARCHAR(100) DEFAULT 'Vietnam',
    city VARCHAR(100) NOT NULL DEFAULT '',
    district VARCHAR(100) NOT NULL DEFAULT '',
    ward VARCHAR(100) NOT NULL DEFAULT '',
    address_line TEXT NOT NULL DEFAULT '',
    address_label VARCHAR(50) DEFAULT '',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT user_addresses_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS one_default_address_per_user
ON user_addresses(user_id)
WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id
ON user_addresses(user_id);
