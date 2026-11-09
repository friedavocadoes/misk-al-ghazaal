# Admin workspace: orders, customers and reliable saves

## Installation
Run `supabase/migration_admin_customer_workspace.sql` in Supabase SQL Editor **after** `migration_orders_workspace.sql` and the existing profile / analytics migrations. It adds a partial customer-order index and two service-only read functions. It does not change existing orders, accounts, payments or roles. Customer directory and statistics show an explicit setup error until it is applied.

## Where to find things
- **Workspace → Customers & staff** (`/admin/users`): super-admin directory, name/email/phone search, account-role filter, 50 accounts per page, customer orders, fully paid spending, ban state and account creation date.
- Click a customer to open `/admin/users/[id]`: account contact information, first/latest order, recent 50 orders, paid spending and account support. Orders staff can open **customer** details from an order; only super admins can open staff details or perform account-management actions.
- `/admin/orders/[id]`: item snapshots with current catalog thumbnails, financial breakdown, saved payment state, fulfillment, courier handover, internal note, delivery estimate, invoice override, status timeline, customer summary and delivery address.
- Ctrl+K / Cmd+K opens Workspace and focuses/selects the search field. Clicking Workspace also focuses search.

## Accuracy rules
- Customer history matches `orders.user_id`, never unverified matching emails. Guests are identified as guests, with no invented account history.
- First-order status counts non-binned orders **earlier than that order**, not orders placed afterward. Cancelled orders remain historical orders.
- Spending counts current `payment_status = paid` orders, excludes recycle-bin records, cancellations and returns. It does not infer payment from delivery or payment method.
- Conversion source and campaign come from that order's recorded purchase session, using its last-touch metadata/referrer and first source when available. Manual/untracked orders do not get invented attribution. This is recorded attribution, not proof of marketing causality.
- Google Maps uses valid checkout coordinates (including zero), or an encoded full-address search when a pin is absent. City/state duplicate lines are removed and country codes are expanded. Dates/times use Asia/Dubai.

## Account management
Only super admins can change roles, request a password reset, ban/unban or delete an account. All actions re-check permissions server-side and write an audit entry. Self-role changes are blocked; ban/delete/reset are customer-only. Demote a staff member explicitly before attempting customer-only support actions.

Password resets use Supabase's existing `resetPasswordForEmail` flow, not an admin-chosen password. Email-provider accounts only; Google customers manage their password with Google. Requests require confirmation and have a 10-minute audit-based cooldown. The storefront `/account/reset` URL must be allowlisted in Supabase Auth. Its email design and sending SMTP remain in Supabase Auth settings. Testing did not send any real emails.

Bans use Supabase Auth's ban duration and can be lifted. Existing stateless JWT access tokens may remain valid until expiration; the UI does not promise instant device sign-out. See [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

Deletion requires both confirmation and the customer's typed email. It removes their uploaded avatars first (only their dedicated folder), then deletes the Auth account. Existing FK cascades remove profile, wishlist/ratings/reviews; order ownership becomes null and order/delivery records remain. This is account deletion, not order erasure or PII anonymization. Auth/Storage/FK errors are shown rather than reported as success. Staff accounts are protected from this workflow. No real accounts were changed during validation.

## Save behavior and legacy pages
`src/components/admin/admin-form.tsx` retains dirty tracking and pending protection, refreshes the current server-rendered page after success, and catches errors for toasts. **A native reset-event listener is necessary**: React resets forms during commit while synthetic event handling is disabled, so a JSX `onReset` handler alone cannot stop saved fields reverting to old defaults. Editor forms prevent the automatic reset. Explicit create forms opt into `resetOnSuccess` and re-baseline after their reset.

Legacy mutation forms in products, reviews, lineups, homepage, recycle bin and promo now use the common wrapper where applicable. Failed writes in the audited product, country, referral, lineup, ritual, review, homepage, email, promo and invoice flows throw errors instead of falsely showing success. `assertAdminWrite` handles legacy unchecked writes. Invoice upload rolls back a new Storage file when saving its order reference fails. Order binning uses the existing transactional RPC; restore/delete revalidate customer order history.

Older content/config pages share the `admin-workspace admin-legacy` shell, spacing, rounded form surfaces and focus treatment. The new order/customer pages use reusable `AdminPanel`/`AdminMetric` components. Existing newer analytics/blog/banner workspaces retain their layouts. `src/app/admin/error.tsx` provides a retry view for failed page loads.

## Code map
| File | Responsibility |
| --- | --- |
| `src/components/admin/admin-form.tsx` | Dirty state, pending state, success/error feedback, editor reset prevention, refresh |
| `src/components/admin/admin-nav.tsx` | Workspace groups, role/email, keyboard search and focus |
| `src/components/admin/workspace.tsx` / `src/app/admin/admin.css` | Shared panel, metric and workspace presentation |
| `src/app/admin/orders/[id]/page.tsx` | Order detail, saved status, invoice and bin actions |
| `src/components/admin/orders/OrderDispatchFields.tsx` | Status, saved payment state, courier tracking controls |
| `src/app/admin/users/page.tsx` | Searchable account directory |
| `src/app/admin/users/[id]/page.tsx` | Account history and support interface |
| `src/app/admin/users/actions.ts` | Protected role/reset/ban/delete mutations and audit |
| `src/lib/admin-customer.ts` | Address/map, Dubai dates, money and account-action guards |
| `src/lib/admin-write.ts` | Propagates DB write failures to admin forms |
| `supabase/migration_admin_customer_workspace.sql` | Service-only directory/customer aggregates |
| `tests/admin-workspace.test.cjs` | Disposable SQL and mocked authorization regressions |

Browser validation used actual page/form components with mocked database/Auth responses on desktop and mobile. No production mutations, account bans/deletions, or emails were performed.
