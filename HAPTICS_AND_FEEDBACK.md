# Paid reporting, storefront haptics and quiet feedback

## Install / deploy

Apply `supabase/migration_paid_feedback.sql` **after** `migration_orders_workspace.sql`, the analytics/location migrations, and earlier survey upgrades. Then deploy the application and updated lockfile (`web-haptics` is included). The migration was tested locally in disposable PostgreSQL, not applied to live Supabase by the coding agent.

Do not rerun older analytics/reporting migrations afterward without reapplying this upgrade: they contain previous definitions of the same SQL reporting functions.

## Paid means paid

The order workspace's **Paid order value**, analytics revenue, acquisition revenue, product revenue, location/page revenue and customer spending now require a matching current order with:

- `payment_status = 'paid'`;
- no recycle-bin deletion;
- an order status other than Cancelled/Returned.

Pending, Authorized, Partially paid, Refunded and Partially refunded do not contribute. We do not have a payment-transaction ledger from which to calculate the retained balance of a partial refund, so those orders are excluded rather than presenting an invented net figure.

COD orders stay out until staff records payment as Paid. Delivery alone does not silently imply payment. A later refund removes the order's value from the reporting totals.

The order list still includes all payment states so staff can manage unpaid orders. Order/unit counts and checkout conversion are behavioral placement counts, not payment-settlement counts. Analytics revenue requires a tracked purchase linked to the saved paid order; manual orders or orders with missing analytics can therefore appear in the Orders workspace without attributable analytics revenue. Revenue uses the original purchase-event date, not an unavailable settlement timestamp. Product revenue remains merchandise value before discounts/shipping, restricted to eligible paid orders.

## Haptic language

The shared controller is mounted only in the storefront. It uses the installed [`web-haptics`](https://github.com/lochie/web-haptics) library with silent fallbacks and debug audio disabled. No payment, cart, navigation or form action waits for a haptic to finish.

| Interaction | Feedback |
| --- | --- |
| Ordinary buttons / navigation | Very short, low-intensity tick |
| Tabs, variants, switches, select choices | Selection accent |
| Quantity changes | Short paired step |
| Bag drawer opening | Light opening pair |
| Drawer dismissal / removal | Softer closing accent |
| Add to bag | Small paired confirmation |
| Add with thumbnail flight | Initial lift and landing accents separated by silence; total 1,250 ms to match the animation |
| Login / account result | Gentle success pair or restrained error pair |
| Accepted order | Strongest short confirmation sequence, only after the server accepts the order |

Buttons on collection, product, login, bag and checkout surfaces are covered. Shared cart/wishlist code supplies explicit feedback where event propagation is stopped. Generic click feedback is deduplicated after React handlers, so an explicit action motif does not get an extra tick. Disabled controls do not vibrate. Native range controls get feedback when a change is committed, not continuous buzzing while dragging.

There is no hover/scroll/autoplay feedback. A recent trusted touch/pen interaction is required; desktop mouse usage stays silent. Backgrounding the page cancels an active pattern. Feedback defaults off for reduced-motion users. **Touch feedback: On/Off** in the footer lets any visitor override it, without logging in.

### Platform limits

Android uses the browser's vibration path. The library approximates intensity with short pulse timing; this is not direct control over Android native haptic composition. Its iOS fallback uses a browser switch mechanism, not unrestricted native Core Haptics. The library’s [open iOS compatibility issue](https://github.com/lochie/web-haptics/issues/41) reports that its current programmatic fallback stops working on iOS 26.5+. Affected iPhones can remain silent; the visible interaction feedback continues. Browser versions, user activation, device hardware and system settings can also reduce patterns or prevent them entirely. Unsupported devices remain functional and silent; there is no audio fallback enabled.

Automated tests verify wiring, pattern timing, fallback DOM and opt-out—not what a physical motor feels like. Final sensory tuning should be done on real iPhones and Android phones. The pattern table is centralized for that purpose.

### Files

- `src/lib/haptics.ts`: motifs, shared dispatch and preference rule; tune durations/intensities here.
- `src/components/blocks/StorefrontHaptics.tsx`: one engine, trusted-input gating, delegated controls, deduplication and cleanup.
- `src/components/blocks/HapticPreference.tsx`: footer preference, persisted as `misk-haptics`.
- `src/lib/cart.tsx`: successful mutations and optional `flight` feedback mode.
- Product card/details/showcase: identify add actions that use the thumbnail flight.
- `src/components/blocks/AuthTabs.tsx`: authentication result accents.
- Checkout page: subtle submission feedback, stronger accepted-order feedback, restrained error feedback.

## Feedback that waits for permission

The questionnaire no longer opens automatically. An eligible shopper sees only a compact, non-modal invitation; the full question appears after they choose to open it. It does not take focus or block shopping.

No invitations appear on bag, checkout, account/login, contact, blogs or the scent-finder form. Entering checkout pauses feedback for the remainder of that mounted shopping visit and records a two-hour browser cooldown. An order attempt records a 24-hour cooldown, including failures, so we do not follow a checkout problem with a question.

Quick desktop exit and 45-second mobile idle prompts were removed. Remaining opportunities are conservative:

- Return to an unfinished bag after at least 30 minutes away, followed by 45 seconds of browsing.
- Product interest after four minutes of foreground viewing without adding it, followed by another 45 seconds.
- Item removal or leaving the bag after at least three minutes of engagement, followed by 60 seconds.

Display also requires at least 15 seconds without an input action and no open dialog. New cart additions, route changes, checkout attempts and purchases cancel pending eligibility requests/invitations. A delayed server response cannot reopen a cancelled invitation.

### Cooldowns and purchase protection

| State | Suppression |
| --- | --- |
| Invitation already shown in this tab/session | Remainder of that tab/session |
| Invitation shown | 24 hours |
| Dismissed | Seven days |
| Purchased | Seven days |
| Answered | 30 days |
| Entered checkout | Two hours, plus the current mounted visit pause |
| Attempted checkout | 24 hours |

Browser history is complemented by a seven-day `misk-feedback-purchase` cookie. Purchase closure broadcasts independently of local/session-storage writes, so denied storage cannot leave the currently visible invitation open. Changes in another tab can close an invitation too.

Before showing an invitation, a private server eligibility request checks purchase events, verified account orders across sessions/devices, existing responses, recent invitations/dismissals and checkout entry. Staff and flagged bots are excluded. Submission repeats the check; a previously saved response is acknowledged without saving another one. If server eligibility is unavailable, the UI stays quiet.

Guest identities cannot be linked across unrelated devices without an account. Cooldowns are not a fraud-proof identity system. The database retains its one-response-per-session constraint.

`survey_shown` now means an invitation was displayed. Earlier rows may represent the previously expanded prompt. Admin feedback reporting calls these **Invitations shown**; the acceptance/open step is not a separately tracked event.

### Files

- `src/components/analytics/CartAbandonmentSurvey.tsx`: contextual scheduling and invitation/form UI.
- `src/components/analytics/survey-options.ts`: localized answer choices.
- `src/lib/analytics/survey-policy.ts`: routes and cooldowns.
- `src/lib/analytics/survey-memory.ts`: resilient purchase/history storage.
- `src/lib/analytics/client.ts`: `markPurchase()` saves suppression before broadcasting closure.
- `src/app/api/analytics/survey/route.ts`: GET eligibility and guarded/idempotent POST.
- `supabase/migration_paid_feedback.sql`: server-side suppression and paid reporting.
- `tests/paid-feedback-haptics.test.cjs`: policy, denied storage, haptic motifs/runtime, fail-closed API and real SQL regressions.

Verification uses mock browser services and disposable local SQL. No live order, feedback response, email or physical-phone haptic test is claimed.
