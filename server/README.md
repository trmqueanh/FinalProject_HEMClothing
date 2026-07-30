# HEM Server

The server is an Express API backed by PostgreSQL.

## Structure

- `config/`: environment and database configuration.
- `controllers/`: HTTP request orchestration grouped by domain. Large admin dashboard
  and order workflows are split into `controllers/admin/` and `controllers/order/`.
- `middleware/`: authentication, authorization, upload, rate limit, and security middleware.
- `models/`: product payload construction and serialization.
- `routes/`: Express routers. Routes keep endpoint compatibility with the storefront.
- `services/`: reusable business and infrastructure services.
- `utils/`: shared stateless helpers.
- `validators/`: request-domain validation rules.
- `scripts/`: maintenance and verification commands.

## Commands

```bash
npm run dev
npm start
npm run check
```

Copy `.env.example` to `.env` and provide real credentials before starting.

Legacy plaintext password rows can be inspected and migrated with:

```bash
npm run passwords:check
npm run passwords:migrate
```

The migration hashes existing legacy values in a transaction. New and changed passwords always use scrypt.

Expired unverified registrations can be removed with:

```bash
npm run users:cleanup-pending
```

Compatibility routes such as `/auth/password`, `/auth/reviews`, and `/auth/accounts`
remain available for older clients and return HTTP deprecation headers pointing to
their current endpoint.
