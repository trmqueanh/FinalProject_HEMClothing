INSERT INTO collections (name, slug, status)
VALUES
  ('Essentials', 'essentials', 'active'),
  ('Denim Studio', 'denim-studio', 'active'),
  ('Modern Basics', 'modern-basics', 'active')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;
