CREATE TABLE IF NOT EXISTS currency_conversion_log (
    migration_name VARCHAR(120) PRIMARY KEY,
    converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
