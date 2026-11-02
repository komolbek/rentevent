# Order quote (`POST /orders/quote`)

Clients (iOS first) show only server-computed totals; they never price a cart themselves.

## Contract
- **Body:** the same as `POST /orders`. Used: `items[{product_id, quantity}]`,
  `rental_start_date`, `rental_end_date`, `event_id`. Ignored: `delivery_type`,
  `delivery_address_id`, `payment_method`, `company_*`, `notes` (they do not change the price).
- **Response** (`data` inside the usual `{ success, data }` wrapper, camelCase):
  `items[{productId, quantity, dailyPrice, totalPrice, savings}]` in request order,
  `rentalDays`, `subtotal`, `deliveryFee` (0 today), `totalAmount`, `totalSavings`.
- **Errors:** the same `400`s as order creation (empty cart, bad quantity, past or reversed
  dates, min/max rental days, inactive product, unknown event, not enough stock on a day), plus
  `429` over the rate limit.
- **Auth:** none, so a guest cart shows totals. Rate limit: 30 requests per minute per IP
  (in-memory, per API instance; IP = last `X-Forwarded-For` entry, set by Railway's proxy).
- **No writes.** It reads products, the event and reservations only.

## One pricing path
`apps/api/src/orders/order-pricing.ts` (`priceOrder`) is the only pricing code.
`OrdersService.parseCart` (items + dates) and `OrdersService.priceCart` (products, event,
rental limits, per-day stock, then `priceOrder`) are shared by `createOrder` and `quoteOrder`.
`createOrder` runs them inside its SERIALIZABLE transaction; `quoteOrder` on the plain client.
A quote is not a reservation: stock can change before the order is placed.

Item limits (both endpoints): at most 100 lines, quantity a whole number from 1 to 10 000, rental period at most 90 days.

Pricing rules (unchanged): event price for products the event lists (FLAT = per fair,
DAILY = per day); otherwise the largest day tier with `days <= rentalDays`, else
`dailyPrice × days`; then the largest quantity tier with `quantity <= qty`, which replaces the
line total with `tier.totalPrice × days`. Sets have no price: the cart sends their products.

Tests: `apps/api/src/orders/orders.service.spec.ts` (quote == created order for tiers,
quantity pricing, a set, FLAT and DAILY event prices; no writes; same rejections).
