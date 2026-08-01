-- Preserve order history when an administrator removes a user account.
ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS fk_orders_user;

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT;
