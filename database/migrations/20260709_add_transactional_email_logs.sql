CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS transactional_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT UNIQUE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sending',
    message_id TEXT NOT NULL DEFAULT '',
    preview_only BOOLEAN NOT NULL DEFAULT false,
    smtp_configured BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT transactional_email_logs_status_check
      CHECK (status IN ('sending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_transactional_email_logs_recipient
ON transactional_email_logs(recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactional_email_logs_status
ON transactional_email_logs(status, created_at DESC);
