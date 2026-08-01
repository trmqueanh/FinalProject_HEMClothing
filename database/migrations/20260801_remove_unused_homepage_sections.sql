-- These legacy homepage tables are no longer used by the storefront or admin API.
BEGIN;

DROP TABLE IF EXISTS homepage_section_items;
DROP TABLE IF EXISTS homepage_sections;

COMMIT;
