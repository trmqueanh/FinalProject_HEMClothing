# HEM Fashion Ecommerce Database

This folder documents the PostgreSQL structure used by the ecommerce system.

The database is intentionally separated by domain:

- `users.sql`: customer and admin accounts.
- `user_profiles.sql`: one editable personal profile and payment preference row per user.
- `user_addresses.sql`: multiple shipping addresses per customer with one default address.
- `departments.sql`: top-level departments such as women and men.
- `product_groups.sql`: Clothing, Shoes, and Accessories group definitions.
- `categories.sql`: one-level product categories by department.
- `size_guides.sql`: one structured sizing guide per category.
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
- `search_history.sql`: logged-in customer search history.
- `transactional_email_logs.sql`: idempotent transactional-email delivery and retry history.
- `currency_conversion_log.sql`: audit marker for the one-time VND conversion migration.

Current backend code also uses `product_materials` and `product_highlights`; these are included in `schema/supporting_tables.sql`. `product_highlights` is reserved for the Materials section's additional material information (`highlight_type = material_information`).

Run schema files in dependency order:

1. `users.sql`
2. `user_profiles.sql`
3. `user_addresses.sql`
4. `departments.sql`
5. `product_groups.sql`
6. `categories.sql`
7. `size_guides.sql`
8. `collections.sql`
9. `fits.sql`
10. `styles.sql`
11. `materials.sql`
12. `products.sql`
13. `product_color_variants.sql`
14. `product_inventory.sql`
15. `inventory_logs.sql`
16. `product_images.sql`
17. `orders.sql`
18. `order_items.sql`
19. `product_sales_counters.sql`
20. `order_status_history.sql`
21. `return_requests.sql`
22. `return_items.sql`
23. `refunds.sql`
24. `carts.sql`
25. `cart_items.sql`
26. `product_reviews.sql`
27. `user_favorites.sql`
28. `vouchers.sql`
29. `search_history.sql`
30. `supporting_tables.sql`
31. `transactional_email_logs.sql`
32. `currency_conversion_log.sql`
33. `landing_collections.sql`

For an existing database, run the migration files in date order before using the upgraded admin features.
