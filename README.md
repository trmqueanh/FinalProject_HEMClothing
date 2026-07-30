# HEM Premium Fashion Ecommerce

HEM is a Vue 3 + Express + PostgreSQL fashion ecommerce capstone project inspired by H&M, Uniqlo, COS, Zara, Shopify, and Apple UI.

The project is organized for a university demo and future production-style growth: storefront, admin dashboard, API, and database schema are separated by responsibility.

## Project Structure

```text
project-root/
├── client/                  # Vue 3 storefront and admin UI
├── server/                  # Express API connected to Neon PostgreSQL
├── database/                # PostgreSQL schema and seed documentation
├── package.json             # Root scripts for client/server workflows
└── README.md
```

## Client Architecture

```text
client/src/
├── api/                     # API facade re-exporting the current HTTP layer
├── components/
│   ├── auth/                # Login/register modal UI
│   ├── cart/                # Cart summary components
│   ├── layout/              # Footer, flash messages, shared shell UI
│   ├── product/             # Product cards and product visuals
│   └── admin/               # Product form and admin-specific components
├── composables/             # Small reusable feature hooks
├── router/                  # Vue Router route definitions and guards
├── services/                # Feature-based API modules
├── stores/                  # Store facades for auth, products, cart, wishlist, search, admin
├── styles/                  # Design tokens, utilities, and motion helpers
├── utils/                   # Formatting, slugging, validation, debounce, constants
└── views/                   # Page-level route components
```

The current UI keeps the premium fashion look: beige canvas, editorial spacing, cinematic page transitions, mega menu, search drawer, product catalog, wishlist, cart, checkout, order history, and admin dashboard.

## Backend Architecture

```text
server/
├── app.js                   # Express app composition and route registration
├── server.js                # Startup only
├── config/database.js       # Neon PostgreSQL pool setup
├── controllers/             # Request/response handlers
├── middleware/              # Auth, admin, error middleware
├── models/                  # Product serialization and payload shaping
├── routes/                  # HTTP route definitions
├── services/                # Reserved for deeper business-logic extraction
├── utils/                   # Auth/token/password helpers
└── validators/              # Reserved for request validation rules
```

API flow:

```text
Vue view/component
→ client service/store
→ Axios API layer
→ Express route
→ middleware
→ controller
→ PostgreSQL pool
→ Neon database
```

## Database Relationships

- `departments` has many `categories` and `products`.
- `categories` can have parent/child categories through `parent_id`.
- `products` belongs to `departments`, `categories`, and optionally `collections`.
- `product_inventory` stores size/color stock variants for each product.
- `users` stores both customers and admins through the `role` column.
- `user_favorites` stores each user's wishlist items.
- `carts` and `cart_items` store current shopping bag state.
- `orders` and `order_items` store completed checkout history.
- `search_history` stores logged-in user search keywords.
- `product_reviews` stores actual review records while `products.rating` and `products.reviews` remain cached summary fields.

## Feature Notes

Search:
Guest history can stay in localStorage. Logged-in user history is saved in `search_history`.

Inventory:
Inventory is tracked per product variant in `product_inventory`; checkout decreases stock and updates product inventory totals.

Reviews:
`product_reviews` is designed for customer reviews, admin replies, moderation, and cached product rating recalculation.

Admin:
Admin routes are protected with `requireAdmin`. The dashboard shows metrics, revenue, orders, products, customers, inventory, and order status controls.

## Common Commands

```bash
npm run client:dev
npm run client:build
npm run server:dev
npm run server:start
npm run server:check
npm run server:lint
```

You can also run each workspace directly:

```bash
cd client && npm run dev
cd server && npm run dev
```
