# iPhone touch-feedback experiment

This branch adds an experimental direct-tap path for iPhone browsers without `navigator.vibrate`. Android keeps the existing `web-haptics` patterns, including the 1.25-second cart-flight accents. No package was added and no browser API is patched.

**Status:** enabled for storefront use after the user reported successful physical-iPhone testing of the first three diagnostic sections. This confirms their tested device, not every iPhone/browser. The temporary compatibility implementation remains in place until the standard library path works reliably again.

## Retiring the workaround later

The single switch is `IOS_DIRECT_TAP_ENABLED` in `src/lib/ios-haptic-taps.ts`. Set it to `false` to disable overlays and restore the standard engine together. First verify the updated library on real affected iPhones, including delayed patterns, and check Android and preference-off behavior. Do not disable only one side of the controller integration.

AGENTS.md §37 lists every integration, attribute, diagnostic and test to remove for a complete cleanup. There is no database migration or customer data to clean up.

## Physical-device verification

The user successfully tested the native switch baseline, direct-tap button and quantity controls on their iPhone. The temporary `/haptics-test` page and its demo component were then removed at their request.

For future checks, enable System Haptics in iPhone settings and Touch feedback in the storefront footer. Test product add-to-bag, variants, wishlist, samples, bag controls and collection Apply; check one activation per tap, scroll gestures and preference-off behavior. Test authentication/checkout only when you intend those real actions. Record the device, exact iOS version and browser when reporting differences. Automated browser checks cannot measure physical feedback.

## Implementation

- `src/lib/ios-haptic-taps.ts`: detects touch Apple devices without the Vibration API. Only explicit `data-ios-haptic="on"` buttons/links are eligible. A transparent native `input[type=checkbox][switch]` captures a physical tap within the control. Its native appearance remains intact and its bounds are clipped to the button's corners. Native input default activation supplies the tick; a zero-delay task activates the original button/link exactly once afterward, preserving form submission and disabled behavior.
- The implementation switch is unnamed, `aria-hidden` and excluded from keyboard tab order; the original control retains its label, state and keyboard operation. ARIA widgets and popup triggers are skipped. The overlay is an experimental implementation detail inside opted-in controls, not a semantic checkbox for the customer. Screen-reader and physical-device validation remain necessary before shipping broadly.
- MutationObserver handles streamed/mounted controls, React text replacements and disabled state. It watches a limited attribute set and avoids repeated disabled writes. Preference changes, reduced-motion changes and visibility update eligibility. Unmount removes inputs/listeners, cancels deferred activations and restores position styles it changed.
- `StorefrontHaptics.tsx`: installs the bridge and suppresses imperative iOS patterns so a tap cannot produce duplicate fallback feedback. The Android engine and existing timing/intensities are unchanged. Native system controls may still have their own OS feedback independently of the site's preference.
- `tests/ios-haptics.test.cjs`: platform selection and optional trusted-touch browser checks. To run the browser test, supply `HAPTIC_PLAYWRIGHT_MODULE` (Playwright module path) and optionally `HAPTIC_BROWSER` (browser executable). Tests cover single activation, actual form submission, unnamed input, disabled controls, opt-out, keyboard activation, new controls, internal links, scroll cancellation and teardown.

## Limits and sources

iOS chooses the native tick's strength. This path cannot promise different intensities, a delayed server-success pulse or Android-style patterns. It acknowledges the **tap**, not a successful backend operation. No audio, popups, main-thread blocking, whole-document label wrappers or continuous vibration tricks are used.

Apple documents native switch feedback in [WebKit's Safari 18 release article](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/). The [web-haptics issue #41](https://github.com/lochie/web-haptics/issues/41) describes the iOS 26.5 programmatic-click break and direct-tap approach. This is an undocumented general-button workaround, not an Apple-supported custom haptics API.

Validation on this branch: TypeScript, targeted lint, trusted-touch Chromium tests and a React 19 harness (repeated text updates, dynamic mounts, submit, accessible tree, unmount). No physical iPhone or vibration hardware has been tested by the coding agent.
