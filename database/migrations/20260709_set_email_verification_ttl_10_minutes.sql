UPDATE users
SET email_verification_expires_at = LEAST(
      COALESCE(email_verification_expires_at, created_at + interval '10 minutes'),
      created_at + interval '10 minutes'
    ),
    updated_at = now()
WHERE email_verified = false;
