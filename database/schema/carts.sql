CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS carts (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT carts_pkey
        PRIMARY KEY (id),

    CONSTRAINT carts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT carts_user_id_key
        UNIQUE (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_key
ON carts(user_id);
