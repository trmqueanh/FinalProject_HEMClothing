# Server Validators

Validators contain reusable input contracts and normalization rules.

- `authValidator.js`: member password and birth-date validation.

Product, order, review, and inventory validation that depends directly on database
state remains beside its transaction for now. Pure validation rules should be moved
here when they are reused by more than one handler.
