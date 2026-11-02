# Account deletion (`DELETE /user/profile`)

Required by App Store guideline 5.1.1(v) for the iOS app; the web can use the same endpoint.

## Decision: anonymize, not hard delete
Orders are accounting records (amounts, order numbers, company name and INN for bank-transfer
invoices) and `orders.user_id` has no cascade. So the `users` row stays as an anonymous stub and
everything that identifies the person is removed.

| Data | What happens |
|---|---|
| Sessions | all deleted (every device is logged out at once) |
| `users.phone_number` | replaced by `deleted:<userId>:<random>` (unique, not a phone) |
| `users.name` | `null` |
| `users.is_active` / `deleted_at` | `false` / now |
| Addresses | deleted; orders that used one get `delivery_address_id = null` |
| Favorites, reviews, notifications | deleted |
| Orders, items, status history, returns, extensions | kept (accounting) |
| `orders.company_name`, `company_inn` | kept: business data on an invoice |
| `orders.notes` (free text the customer typed) | kept; may hold personal data, see open points |

Signing in again with the same phone number creates a new, empty account: old orders are not
reattached.

## Rules
- Auth required (`UserAuthGuard`); the user id comes from the session, never from the request.
- `409` while the account has orders in `CONFIRMED`, `PREPARING` or `DELIVERED`: the equipment
  is still out or about to be. The client shows the message and offers to cancel or wait.
- `404` if the account is already deleted (cannot normally happen: its sessions are gone).
- Everything, including the open-order check, runs in one SERIALIZABLE transaction. An order
  placed on another device at the same moment makes one of the two fail (Prisma `P2034`,
  served as 500); the client retries. An order is never left open on a deleted account.
- Response: `{ success: true }` (wrapped by the global response interceptor).

## Open points (owner / legal)
- Retention: how long anonymized orders are kept, and whether `orders.notes` should be cleared
  too. Not decided; the privacy page already promises the right to delete data (`privacy.s6`).
- Admin "Customers" hides deleted users (`deleted_at` filter); their orders still show in
  "Orders" with no name and the phone field showing the `deleted:<id>:<hex>` placeholder.
- Not checked before deleting: open return requests, pending rental extensions, and RETURNED
  orders with an unpaid damage fee. Such an account can be deleted and its orders lose the
  address link (orders keep no copy of the address). To decide before the iOS release.
