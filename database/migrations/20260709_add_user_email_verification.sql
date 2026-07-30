ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE;

UPDATE users
SET email_verified = true,
    email_verified_at = COALESCE(email_verified_at, updated_at, created_at, now()),
    email_verification_expires_at = NULL
WHERE email_verified = false;

CREATE INDEX IF NOT EXISTS idx_users_pending_email_verification
ON users(email_verification_expires_at)
WHERE email_verified = false;
