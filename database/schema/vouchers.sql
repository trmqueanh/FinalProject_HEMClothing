CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(30) NOT NULL,
    discount_value NUMERIC(12, 2) NOT NULL,
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    max_discount_amount NUMERIC(12, 2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT vouchers_discount_type_check CHECK (discount_type IN ('percent', 'fixed')),
    CONSTRAINT vouchers_discount_value_check CHECK (discount_value > 0),
    CONSTRAINT vouchers_percent_value_check CHECK (discount_type <> 'percent' OR discount_value <= 100),
    CONSTRAINT vouchers_min_order_amount_check CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
    CONSTRAINT vouchers_max_discount_amount_check CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    CONSTRAINT vouchers_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit >= 0),
    CONSTRAINT vouchers_per_user_limit_check CHECK (per_user_limit IS NULL OR per_user_limit > 0),
    CONSTRAINT vouchers_used_count_check CHECK (used_count >= 0),
    CONSTRAINT vouchers_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT vouchers_date_range_check CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_status
ON vouchers(status);

CREATE INDEX IF NOT EXISTS idx_vouchers_deleted_at
ON vouchers(deleted_at);

CREATE INDEX IF NOT EXISTS idx_vouchers_dates
ON vouchers(start_date, end_date);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    voucher_code VARCHAR(100) NOT NULL,
    order_subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT voucher_redemptions_order_unique UNIQUE (order_id),
    CONSTRAINT voucher_redemptions_subtotal_check CHECK (order_subtotal >= 0),
    CONSTRAINT voucher_redemptions_discount_check CHECK (discount_amount >= 0 AND discount_amount <= order_subtotal)
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user_voucher
ON voucher_redemptions(user_id, voucher_id, created_at DESC);
