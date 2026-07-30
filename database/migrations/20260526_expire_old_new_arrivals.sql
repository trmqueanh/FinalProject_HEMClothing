UPDATE products
SET new_arrival = false,
    updated_at = now()
WHERE new_arrival = true
  AND created_at < now() - interval '14 days';
