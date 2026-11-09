# Admin attention and the correspondence studio

## Install
Run `supabase/migration_admin_attention.sql` in Supabase SQL Editor **after** the existing contact inbox, orders workspace and product review migrations, before deploying this update. It adds private read receipts and service-only functions; it does not change order status, payment state, message contents or review approval.

The project already includes GSAP. This update adds no dependency or external notification service. Validation used disposable PostgreSQL and mocked browser requests; no live order/message/review was altered.

## Notification rules
Unread state belongs to each staff member. One person's reading does not clear another person's queue.

| Kind | Appears while | Reading |
| --- | --- | --- |
| Orders | Status is `new`, not in recycle bin, not read by this staff member | Actual order detail view marks read |
| Contact inbox | Message not read by this staff member | Actual message detail view marks read |
| Product reviews | Not approved and not read by this super admin | Review detail marks read; list has explicit controls |

Approved reviews and confirmed/binned orders disappear from new-item counts even if they were not opened. Reading an order does **not** confirm it, and reading a review does **not** approve it. Inbox feedback sent through the contact form counts under the inbox, separately from product review moderation.

The Workspace button badge totals all unread kinds available to that role. Sidebar badges show their individual counts. The bell has an unread indicator and opens a dropdown under the navbar with brief previews and direct detail links. It shows the newest 20 unread entries while badges count every eligible unread item. Opening the dropdown alone does not mark anything read.

The UI polls every 15 seconds only while the page is visible, and refreshes on focus, opening the menu, and successful admin/read mutations. A storage timestamp broadcasts refreshes across browser tabs without storing notification contents. No sensitive tables were exposed through public Realtime policies. Existing counts remain on transient refresh errors; expired/forbidden sessions clear them. Changing account/role resets the provider. Content editors do not receive operational/customer notifications.

## Inbox
`/admin/inbox` is a stack of compact, clickable conversations rather than expanded message bodies. Filter by private-label / feedback / client-care tags and all / unread / read. Search name, email, reference or message; filters are preserved when switching categories or paging. Thirty messages per page, stable newest-first ordering.

`/admin/inbox/[id]` displays the full enquiry, readable field labels, contact links and reply-by-email action. The detail marks read only after the client actually mounts visibly, not during server rendering or prefetching. Mark as unread is explicit and stays unread until the next actual visit or another explicit read. Lists can mark read/unread directly. Per-staff counts and filters are SQL-backed rather than local browser flags.

`/admin/reviews/[id]` provides the equivalent full review view and read toggle, alongside existing approval/delete controls. Review mutations moved into one shared actions module; deleting from detail returns to the list. Approval still uses the existing storefront revalidation path helpers.

Only super admins and orders staff can access operational notifications/contact inbox; only super admins can read product review notifications or moderate reviews. API and SQL both enforce these boundaries. RPC execution and receipt-table access are service-only. Read metadata is not appended to business audit logs on every view; existing business mutations keep their audit trail.

## Contact page
The existing hero and its transparent-header behavior are preserved. Below it:
- An asymmetric contact desk gives WhatsApp prominence, with lighter phone/email/social lines and a location panel. Existing direct actions and copy controls remain available.
- A four-stage composer separates reason, message details, contact information and final review. Every prior meeting, review and complaint field remains available.
- A layered envelope/letter responds to selected topic and local form values. The illustration uses CSS geometry and the existing logo, not a large image/video download.
- GSAP ScrollTrigger introduces once-only reveals and shallow depth/parallax below the hero. A separate GSAP stage transition animates form changes. Fine mouse input can tilt the decorative letter; hit areas and input fields remain stable.
- Motion is scoped to the contact content, cleaned up on route/media changes, and disabled for reduced motion. Mobile keeps the full flow with a compact illustration and lighter motion. Native scrolling remains intact: no ScrollSmoother, pinning, scroll hijack or hero animation was added.
- Server-rendered content remains visible when animation cannot initialize. The catalog-dependent composer still streams behind Suspense. Keyboard heading focus follows steps, error/retry preserves input, and the final review shows all provided relevant fields with Edit actions.
- Submission still uses the real private inbox and existing throttled endpoint. Fields belonging to an abandoned topic are cleared from the submitted normalized record, while browser form state is retained if the user navigates back. Contact feedback remains an enquiry, not an automatic public review.

## Code map
| File | Responsibility |
| --- | --- |
| `supabase/migration_admin_attention.sql` | Per-staff receipts, role-aware feed, atomic read toggle, filtered inbox |
| `src/lib/admin-attention.ts` | Notification types, badge formatting, cross-tab refresh signal |
| `src/app/api/admin/notifications/route.ts` | Authenticated counts and read-state endpoint, origin validation |
| `src/components/admin/notifications.tsx` | Provider, dropdown, badges, visible-view read controls |
| `src/components/admin/admin-nav.tsx` | Navbar/sidebar integration and existing Ctrl/Cmd+K search |
| `src/components/admin/admin-form.tsx` | Successful mutations signal counts to refresh |
| `src/app/admin/inbox/page.tsx` | Search, filters and conversation stacks |
| `src/app/admin/inbox/[id]/page.tsx` | Full message and read controls |
| `src/lib/contact-inbox.ts` | Topic labels, row shape, readable detail labels |
| `src/app/admin/reviews/actions.ts` / `[id]/page.tsx` | Shared moderation actions and review detail |
| `src/components/blocks/ContactMotion.tsx` | Scoped GSAP reveals/parallax and media cleanup |
| `src/components/blocks/ContactLetter.tsx` | Lightweight 3D envelope and local live preview |
| `src/components/blocks/ContactExperience.tsx` | Four-stage enquiry flow, validation, confirmation and sending |
| `src/components/blocks/ContactChannels.tsx` | Asymmetric direct-contact layout |
| `tests/admin-attention.test.cjs` | Real SQL permissions, read isolation, pagination and endpoint guards |

Motion follows [GSAP matchMedia cleanup](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) and [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) patterns. Browser validation covers desktop/mobile notification bounds, empty-to-new bell state, auto-read/manual unread, sidebar badges, keyboard search, and all three contact topics through confirmation/submission with mocked requests.
