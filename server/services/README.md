# Server Services

Services contain reusable business or infrastructure operations that are independent
from Express route registration.

- `emailService.js`: SMTP delivery and safe development previews.
- `emailVerificationService.js`: signed, expiring email-verification tokens for pending registrations.
- `fileStorageService.js`: uploaded-file signature validation and cleanup.
- `passwordResetService.js`: signed, expiring password-reset tokens tied to the current password hash.
- `voucherService.js`: voucher lookup, validation, serialization, and discount calculation.
- `commerceWorkflowService.js`: centralized, backend-enforced return and refund status transitions.
- `refundService.js`: deterministic order-discount allocation, snapshot-based partial-refund math,
  system-refund idempotency, paid-amount caps, and aggregate payment-status synchronization.

Refund policy: customer endpoints never create refunds. Paid cancellations create a pending
refund for the remaining paid order balance (including shipping). Product returns create one
pending refund only after receipt and successful inspection, using accepted item quantities and
stored order-item net values. Shipping is not refunded for product returns, including full-order
returns; this conservative policy can only be changed through a future explicit business rule.
All money movement remains a manual QR bank transfer completed by an admin with a transaction
reference.

Controllers remain responsible for request orchestration and database transactions.
Shared stateless database helpers live in `utils/`.
