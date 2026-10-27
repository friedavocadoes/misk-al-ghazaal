# Admin orders workspace

Implemented 27 October 2026. Open **Admin → Orders**. Order staff and super admins can use the list, export, creation, and bulk endpoints. Content editors and customers cannot.

## Install

Run `supabase/migration_orders_workspace.sql` after existing order/product-options/samples/optional-stock migrations, then deploy. The migration adds payment state, manual-order metadata, a safe order-number sequence, indexes, and privileged reporting/mutation functions. Existing order data and legacy Packed statuses are preserved. Existing payments default to Pending; delivered COD orders are not silently assumed paid.

The migration was tested in disposable local PostgreSQL and was not applied to live Supabase by the coding agent.

## Workspace

- Summary cards: matching orders, units ordered, active order value, unpaid orders, parcels with the courier, delivered orders.
- Columns: selection, order number, readable Dubai date, customer, amount, payment status, payment type, order status, item quantities/details.
- Search by order number, customer name, email, phone, or tracking number.
- Filter by order status, payment status/type and inclusive Dubai date range. Sort by date or amount.
- Paginate 50 orders at a time; select up to 200 across pages. Changing filters clears selection to prevent unintended cross-filter actions.
- Export all matching orders across every page, or selected matching orders, as Excel-compatible UTF-8 CSV. Exports are authorized, private/no-store, audited, and formula escaped.
- Bulk change order status/payment state or move selected orders to the recycle bin. A review dialog shows the action and selection count. Updates are atomic: a validation failure rolls back the entire selection.

Summary values use the chosen filters. Active order value excludes Cancelled/Returned. Units include complimentary item lines where present. CSV exports represent a live database read, not an immutable accounting snapshot during concurrent changes.

## Statuses and tracking

New order → Confirmed → Dispatched → Out for delivery → Delivered, with Cancelled/Returned as terminal alternatives.

**Dispatched means actual courier handover.** Selecting Dispatched or Out for delivery requires a tracking number on that order. For a bulk dispatch, every selected order must already have a tracking number; otherwise none are changed.

Old `packed` rows are retained as **Packed (legacy)**, rather than falsely claiming handover. They can be moved to the new statuses. The shopper timeline treats legacy packing as preparation/confirmation, not evidence of dispatch.

Max Express is the default: `https://maxexuae.com/tracking/`. The order editor offers **Use another courier or tracking link**. A verified alternate carrier link may contain `{tracking}` to insert a URL-encoded tracking number.

The public [Max Express tracking page](https://maxexuae.com/tracking/) was inspected: its form submits a `trackno` field by POST. No working GET deep-link parameter was verified. We therefore do not invent one or submit guessed tracking numbers.

On the website, **Track order** attempts to copy the number and opens the courier page in a new tab. The UI explains that it must be pasted there. If clipboard access is denied/unavailable, the customer can copy the visible number manually. Our page cannot inject text into another company's page. Emails likewise display the number and link without promising automatic copy/paste.

Only parcels with a tracking number and a shipping/delivered status (or legacy Packed) expose the shopper tracking control. Merely having the default tracking URL does not make an unshipped order trackable.

## Payment fields

Payment types: COD, card, wallet, Tabby, Tamara. The table reads the saved order method, so a future payment integration can supply its actual verified method rather than the admin UI guessing.

Payment states: Pending, Authorized, Paid, Partially paid, Refunded, Partially refunded, Voided, Failed.

Admin edits are bookkeeping only: they do not charge, capture, void, or refund money. Manual creation can record Pending or Paid externally. Storefront checkout remains COD. Tap/Tabby/Tamara checkout initiation and verified webhook processing have not been introduced by this task.

Existing order cancellation behavior is preserved: it does not automatically refund money or replenish product/sample stock.

## Manual orders

Use **Create order** to add live products and choose concentration/size variants, quantities, customer/delivery details, payment record, and optional delivery-charge override. The default delivery charge uses current pricing rules; delivery country must be enabled in admin settings.

Server quoting resolves product choices. The database then locks catalog/inventory rows, verifies availability, re-reads current prices, reserves finite stock, and inserts the order, items and initial history in one transaction. Blank stock remains unlimited. An invalid option, inactive/manual-sold-out product, or insufficient finite stock rolls everything back.

Repeated submissions share a request UUID. A retry returns the same order, including after a successful order exhausted the stock. Order numbers use a sequence shared with storefront checkout, rather than `count(*) + 1`, so concurrent creation/deletion cannot cause that old number-allocation race.

Manual orders do not automatically add samples/coupons, charge a payment gateway, or generate a storefront analytics purchase event. They are real saved order records and use the existing invoice/order history. They start without an account binding; the existing verified guest-order claiming flow can associate them later.

The optional confirmation email respects saved order-mail preferences. Status updates can optionally email customers; payment-only bulk changes do not create status emails. Email work runs after the database save and is best effort.

## Code map

| File | Responsibility |
| --- | --- |
| `src/app/admin/orders/page.tsx` | Authorized workspace entry |
| `src/components/admin/orders/OrdersWorkspace.tsx` | Search, filters, summaries, table, selection, bulk dialog, exports |
| `src/app/admin/orders/new/page.tsx` | Authorized manual creation entry |
| `src/components/admin/orders/CreateOrderForm.tsx` | Product/options picker, customer form, estimated totals, request UUID |
| `src/app/admin/orders/[id]/page.tsx` | Order details, update action, existing invoice/bin actions |
| `src/components/admin/orders/OrderDispatchFields.tsx` | Status/payment fields, courier default/override and tracking requirements |
| `src/app/api/admin/orders/route.ts` | Authorized list and manual-create APIs |
| `src/app/api/admin/orders/bulk/route.ts` | Authorized atomic bulk action, audit, notifications and freshness |
| `src/app/api/admin/orders/export/route.ts` | Paginated matching/selected CSV export |
| `src/lib/admin-orders-query.ts` | Search/filter/date/selection validation |
| `src/lib/admin-orders-model.ts` | Payment vocabulary, row contract, readable Dubai dates |
| `src/lib/order-status.tsx` | Canonical status vocabulary and timeline/chips |
| `src/lib/order-tracking.ts` | Default URL, safe carrier link templates, trackability rule |
| `src/components/blocks/TrackOrderButton.tsx` | Copy-and-open shopper tracking interaction |
| `src/lib/order-notifications.ts` | Shared saved-order notification hydration, preferences and invoice attachment |
| `supabase/migration_orders_workspace.sql` | Schema, sequence, report and transactional mutation RPCs |
| `tests/orders-workspace.test.cjs` | SMTP, tracking, dates, access, export and real PostgreSQL regressions |

For all email design locations, see [System emails](SYSTEM_EMAILS.md).
