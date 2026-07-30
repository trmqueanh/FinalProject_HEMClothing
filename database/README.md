# HEM Fashion Ecommerce Database

This folder documents the PostgreSQL structure used by the ecommerce system.

The database is intentionally separated by domain:

- `users.sql`: customer and admin accounts.
- `user_profiles.sql`: one editable personal profile and payment preference row per user.
- `user_addresses.sql`: multiple shipping addresses per customer with one default address.
- `departments.sql`: top-level departments such as women and men.
- `product_groups.sql`: Clothing, Shoes, and Accessories group definitions.
- `categories.sql`: one-level product categories by department.
- `fits.sql`: Clothing fit options scoped by department and product group.
- `products.sql`: sellable product records and cached review summaries.
- `product_inventory.sql`: product size and color inventory variants.
- `inventory_logs.sql`: audit log for import, reserve, sale, refund, adjustment, and release events.
- `product_images.sql`: product gallery images by product and optional color.
- `collections.sql`: editorial and campaign groupings.
- `styles.sql`: product style lookup rows.
- `materials.sql`: reusable material definitions used by product composition rows.
- `product_color_variants.sql`: exact color variants plus customer-friendly color families and product codes.
- `orders.sql` and `order_items.sql`: checkout records and order line items.
- `product_sales_counters.sql`: keeps `products.sold_count` synchronized with completed order items.
- `order_status_history.sql`: status-change audit trail for admin and customer order updates.
- `return_requests.sql` and `return_items.sql`: customer item/quantity return requests, customer-confirmed refund bank details, and their workflow.
- `refunds.sql`: system-created cancellation and accepted-product refunds processed manually by admins.
- `product_reviews.sql`: customer reviews, moderation, and admin replies.
- `carts.sql` and `cart_items.sql`: one active shopping cart per customer and its product lines.
- `user_favorites.sql`: per-user saved products.
- `vouchers.sql`: public voucher management.
- `homepage_sections.sql` and `homepage_section_items.sql`: admin-controlled homepage sections.
- `search_history.sql`: logged-in customer search history.
- `transactional_email_logs.sql`: idempotent transactional-email delivery and retry history.

Current backend code also uses `product_materials` and `product_highlights`; these are included in `schema/supporting_tables.sql`. `product_highlights` is reserved for the Materials section's additional material information (`highlight_type = material_information`).

Run schema files in dependency order:

1. `users.sql`
2. `user_profiles.sql`
3. `user_addresses.sql`
4. `departments.sql`
5. `product_groups.sql`
6. `categories.sql`
7. `collections.sql`
8. `fits.sql`
9. `styles.sql`
10. `materials.sql`
11. `products.sql`
12. `product_color_variants.sql`
13. `product_inventory.sql`
14. `inventory_logs.sql`
15. `product_images.sql`
16. `orders.sql`
17. `order_items.sql`
18. `product_sales_counters.sql`
19. `order_status_history.sql`
20. `return_requests.sql`
21. `return_items.sql`
22. `refunds.sql`
23. `carts.sql`
24. `cart_items.sql`
25. `product_reviews.sql`
26. `user_favorites.sql`
27. `vouchers.sql`
28. `homepage_sections.sql`
29. `homepage_section_items.sql`
30. `search_history.sql`
31. `supporting_tables.sql`
32. `transactional_email_logs.sql`
33. `landing_collections.sql`

For an existing database, run the migration files in date order before using the upgraded admin features.
