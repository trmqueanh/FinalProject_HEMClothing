INSERT INTO departments (name, label)
VALUES
  ('women', 'Women'),
  ('men', 'Men')
ON CONFLICT (name) DO UPDATE
SET label = EXCLUDED.label;

