"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product, Coupon } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { formatAED } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { defaultVariant } from "@/lib/product-options";
import { flyToBag } from "@/lib/fly-to-bag";
import { VariantPicker } from "@/components/product/VariantPicker";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { NoteTooltip } from "@/components/product/NoteTooltip";
import { PdpOffers } from "@/components/blocks/PdpOffers";
import { SamplePicker } from "@/components/blocks/SamplePicker";
import { PRODUCT_FRAMES } from "./motion-config";
import { editionFor } from "./config";
import { editionStory } from "./story";
import { AtelierProductGallery } from "./AtelierProductGallery";
import { SculptureScene } from "./SculptureScene";
import { AtelierPanel } from "./AtelierPanel";
import { AtelierBagButton, AtelierQuantity } from "./AtelierControls";
import s from "./atelier.module.css";

export function OriginalesProduct({
  product,
  coupons,
  locale,
  stores,
  reviews,
}: {
  product: Product;
  coupons: Coupon[];
  locale: Locale;
  stores: ReactNode;
  reviews: ReactNode;
}) {
  const ar = locale === "ar",
    edition = editionFor(product),
    narrative = editionStory(edition.name, ar);
  const router = useRouter(),
    { add } = useCart(),
    root = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false),
    [variantId, selectVariant] = useState(defaultVariant(product)?.id),
    [qty, setQty] = useState(1),
    [added, setAdded] = useState(false),
    [buyPending, setBuyPending] = useState(false),
    [couponLogin, setCouponLogin] = useState(false),
    [mobileDock, setMobileDock] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const variant =
      product.variants.find((v) => v.id === variantId) ??
      defaultVariant(product),
    stock = product.outOfStock ? 0 : (variant?.stock ?? Infinity),
    safeQty = Math.min(qty, Math.max(1, Math.min(20, stock))),
    price = variant?.price ?? product.price,
    bottle = edition.bottle ?? product.images[0] ?? "/logo.webp";
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      if (live) setReady(true);
    }, 2200);
    Promise.all(
      [
        ...(stage.current?.querySelectorAll<HTMLImageElement>(
          "[data-arrival] img",
        ) ?? []),
      ].map((image) => image.decode().catch(() => {})),
    ).then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
      clearTimeout(timer);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [product.slug]);
  useEffect(() => {
    let frame = 0;
    const media = matchMedia("(max-width:759px)");
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!media.matches) {
          setMobileDock(false);
          return;
        }
        const purchase =
          root.current?.querySelector<HTMLElement>("[data-purchase]");
        const bounds = root.current?.getBoundingClientRect();
        setMobileDock(
          !!(
            media.matches &&
            purchase &&
            bounds &&
            purchase.getBoundingClientRect().bottom < 85 &&
            bounds.bottom > 180
          ),
        );
      });
    };
    measure();
    addEventListener("scroll", measure, { passive: true });
    addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", measure);
      removeEventListener("resize", measure);
    };
  }, [product.slug]);
  useEffect(() => {
    let live = true,
      dispose = () => {};
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ default: gsap }, { ScrollTrigger }]) => {
        if (!live || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add(
          {
            motion: "(prefers-reduced-motion:no-preference)",
            mobile: "(max-width:759px)",
            desktop: "(min-width:760px)",
          },
          (context) => {
            if (!context.conditions?.motion || context.conditions.mobile)
              return;
            const node = root.current!,
              mobile = !!context.conditions.mobile,
              scene = node.querySelector<HTMLElement>("[data-scene]")!,
              buy = node.querySelector<HTMLElement>("[data-purchase]")!,
              title = node.querySelector<HTMLElement>(
                "[data-travelling-title]",
              )!,
              dock = node.querySelector<HTMLElement>("[data-title-dock]")!;
            gsap.set(node.querySelector("[data-bottle]"), {
              xPercent: -50,
              yPercent: -45,
              x: 0,
              y: 0,
            });
            gsap.set(node.querySelector("[data-box]"), {
              xPercent: -50,
              yPercent: -45,
              x: 0,
              y: 0,
            });
            gsap.set(title, {
              left: 0,
              top: 0,
              fontSize: mobile
                ? scene.clientWidth * 0.118
                : scene.clientWidth * 0.108,
              x: 0,
              y: 0,
            });
            gsap.set(title, {
              x: () => (scene.clientWidth - title.offsetWidth) / 2,
              y: () => scene.clientHeight * 0.24,
            });
            const destination = () => {
              const d = dock.getBoundingClientRect(),
                r = scene.getBoundingClientRect();
              return {
                x: d.left - r.left,
                y: d.top - r.top - (Number(gsap.getProperty(buy, "y")) || 0),
              };
            };
            const tl = gsap.timeline({
              onUpdate: () => {
                node.dataset.priceReady = tl.time() >= 0.95 ? "true" : "false";
              },
              scrollTrigger: {
                trigger: node.querySelector("[data-runway]"),
                start: "top top",
                end: () => "+=" + innerHeight * PRODUCT_FRAMES.dock,
                scrub: 1,
                invalidateOnRefresh: true,
              },
            });
            tl.to(
              node.querySelector("[data-bottle]"),
              {
                x: () => (mobile ? 0 : -scene.clientWidth * 0.23),
                y: () =>
                  mobile
                    ? -scene.clientHeight * 0.16
                    : -scene.clientHeight * 0.12,
                scale: mobile ? 0.66 : 0.68,
                duration: 0.85,
                ease: "power2.inOut",
              },
              0.05,
            );
            tl.fromTo(
              node.querySelector("[data-box]"),
              { opacity: 0, x: mobile ? -160 : -360, scale: 0.82 },
              {
                opacity: 1,
                x: () =>
                  mobile ? -scene.clientWidth * 0.2 : -scene.clientWidth * 0.35,
                y: () => -scene.clientHeight * 0.1,
                scale: mobile ? 0.64 : 0.68,
                duration: 0.7,
                ease: "power2.inOut",
              },
              0.23,
            );
            tl.to(
              title,
              {
                x: () => destination().x,
                y: () => destination().y,
                fontSize: mobile ? 30 : Math.min(43, scene.clientWidth * 0.035),
                duration: 0.8,
                ease: "power2.inOut",
              },
              0.15,
            );
            tl.to(
              node.querySelector("[data-scroll-cue]"),
              { autoAlpha: 0, duration: 0.2 },
              0.2,
            );
            tl.fromTo(
              buy,
              { opacity: 0, y: 25 },
              {
                opacity: 1,
                y: 0,
                duration: 0.35,
                onStart: () => {
                  buy.inert = false;
                },
                onReverseComplete: () => {
                  buy.inert = true;
                },
              },
              0.63,
            );
            buy.inert = true;
            // Dock the same live controls beneath the same persistent bottle/box nodes.
            const compact = gsap.timeline({
              onUpdate: () => {
                const docked = compact.progress() > 0.55;
                node.dataset.docked = docked ? "true" : "false";
                const details = node.querySelector<HTMLElement>(
                  "[data-purchase-details]",
                );
                if (details) details.inert = docked;
              },
            });
            compact.to(
              buy,
              mobile
                ? { bottom: 12, duration: 1 }
                : {
                    left: "6%",
                    right: "auto",
                    width: "39%",
                    top: "78%",
                    maxWidth: "none",
                    duration: 1,
                  },
              0,
            );
            compact.to(
              node.querySelector("[data-purchase-details]"),
              {
                height: 0,
                opacity: 0,
                margin: 0,
                duration: 0.65,
              },
              0,
            );
            compact.to(title, { opacity: 0, duration: 0.35 }, 0);
            compact.to(
              node.querySelector("[data-bottle]"),
              mobile
                ? {
                    y: () => -scene.clientHeight * 0.17,
                    scale: 0.26,
                    duration: 1,
                  }
                : {
                    y: () => -scene.clientHeight * 0.13,
                    scale: 0.62,
                    duration: 1,
                  },
              0,
            );
            compact.to(
              node.querySelector("[data-box]"),
              mobile
                ? {
                    y: () => -scene.clientHeight * 0.17,
                    scale: 0.26,
                    duration: 1,
                  }
                : {
                    y: () => -scene.clientHeight * 0.15,
                    scale: 0.62,
                    duration: 1,
                  },
              0,
            );
            tl.fromTo(
              node.querySelector("[data-product-gallery]"),
              {
                autoAlpha: 0,
                x: 32,
                filter: "blur(8px)",
                clipPath: "inset(0% 0% 0% 65% round 12px)",
              },
              {
                autoAlpha: 1,
                x: 0,
                filter: "blur(0px)",
                clipPath: "inset(0% 0% 0% 0% round 2px)",
                duration: 0.32,
              },
              0.63,
            );
            compact.timeScale(2.3);
            tl.add(compact, 1.45);
            ScrollTrigger.refresh();
            return () => {
              buy.inert = false;
              const details = node.querySelector<HTMLElement>(
                "[data-purchase-details]",
              );
              if (details) details.inert = false;
              delete node.dataset.docked;
              delete node.dataset.priceReady;
            };
          },
          root.current,
        );
        dispose = () => mm.revert();
      })
      .catch(() => {});
    return () => {
      live = false;
      dispose();
    };
  }, [product.slug]);
  const purchase = async (
    event: React.MouseEvent<HTMLButtonElement>,
    now = false,
  ) => {
    if (stock <= 0 || buyPending || (now && couponLogin)) return;
    add(
      { productSlug: product.slug, variantId: variant?.id, qty: safeQty },
      now ? undefined : "flight",
    );
    if (now) {
      setBuyPending(true);
      let code = "";
      try {
        code = localStorage.getItem("misk-coupon") ?? "";
      } catch {}
      if (code) {
        try {
          const {
            data: { user },
          } = await createClient().auth.getUser();
          if (!user) {
            setCouponLogin(true);
            setBuyPending(false);
            return;
          }
        } catch {}
      }
      router.push("/checkout");
      return;
    }
    flyToBag(event.currentTarget, bottle);
    setAdded(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setAdded(false), 2100);
  };
  return (
    <div
      ref={root}
      className={`${s.product} ${s.stickyProduct}`}
      style={
        {
          "--edition-accent": edition.accent,
          "--edition-wash": edition.wash,
        } as CSSProperties
      }
    >
      <div className={s.arrival} data-ready={ready} aria-hidden="true">
        <span>O</span>
        <small>MAG PARFUM / ORIGINALES</small>
      </div>
      <section data-runway className={`${s.runway} ${s.fullExperience}`}>
        <section
          ref={stage}
          data-scene
          className={s.scene}
          aria-label={edition.name}
        >
          {edition.backdrop && (
            <div data-arrival className={s.heroBackdrop}>
              <Image
                src={edition.backdrop}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
          )}
          <div className={s.heroHalo} />
          <div className={s.sceneCaption}>
            <span>ORIGINALES / {edition.number}</span>
            <span>{ar ? "تعبيرك الخاص" : "AN EXPRESSION OF YOU"}</span>
          </div>
          <h1 data-travelling-title className={s.frostedTitle}>
            {variant?.nameOverride ?? edition.name}
          </h1>
          <div data-box className={s.boxObject}>
            {edition.box && (
              <Image
                src={edition.box}
                alt={`${edition.name} presentation box`}
                fill
                sizes="(max-width:759px) 45vw, 29vw"
                className="object-contain"
              />
            )}
          </div>
          <div data-bottle data-arrival className={s.bottleObject}>
            <Image
              src={bottle}
              alt={`${edition.name} — MAG Parfum Originales`}
              fill
              priority
              sizes="(max-width:759px) 65vw, 34vw"
              className="object-contain"
            />
          </div>
          <a
            data-scroll-cue
            className={s.scrollCue}
            href="#originales-purchase"
            onClick={(e) => {
              e.preventDefault();
              const r = root.current
                ?.querySelector("[data-runway]")
                ?.getBoundingClientRect();
              if (r)
                scrollTo({
                  top: scrollY + r.top + innerHeight * PRODUCT_FRAMES.price,
                  behavior: matchMedia("(prefers-reduced-motion:reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                });
            }}
          >
            {ar ? "اكتشف العطر" : "Scroll to discover"}
            <ArrowDown size={15} />
          </a>
          <AtelierProductGallery
            key={variant?.id ?? product.id}
            images={variant?.images?.length ? variant.images : product.images}
            bottle={bottle}
            box={edition.box ?? undefined}
            name={edition.name}
            ar={ar}
          />
          <div
            id="originales-purchase"
            data-purchase
            className={s.purchase}
            inert={mobileDock || undefined}
          >
            <div className={s.compactIdentity}>
              <span>{variant?.nameOverride ?? edition.name}</span>
              <span>{formatAED(price)}</span>
            </div>
            <div data-purchase-details className={s.purchaseDetails}>
              <p className={s.kicker}>
                MAG PARFUM · ORIGINALES {edition.number}
              </p>
              <div data-title-dock className={s.titleDock} aria-hidden="true" />
              <div className={s.signaturePrice}>
                <span>{ar ? "تعبير أصيل" : "YOUR ORIGINAL EXPRESSION"}</span>
                <p>{formatAED(price)}</p>
              </div>
              <VariantPicker
                product={product}
                variant={variant}
                onSelect={selectVariant}
                ar={ar}
              />
            </div>
            <AtelierQuantity
              value={safeQty}
              max={Math.min(20, stock)}
              onChange={setQty}
              ar={ar}
            />
            <div className={s.purchaseActions}>
              <AtelierBagButton
                added={added}
                disabled={stock <= 0}
                onClick={(e) => void purchase(e)}
                ar={ar}
                quantity={safeQty}
              />
              <button
                data-ios-haptic="on"
                className={s.buyButton}
                disabled={stock <= 0 || buyPending}
                onClick={(e) => void purchase(e, true)}
              >
                {buyPending
                  ? ar
                    ? "جارٍ المتابعة…"
                    : "Continuing…"
                  : ar
                    ? "اشتر الآن"
                    : "Purchase now"}
                <ArrowUpRight size={16} />
              </button>
            </div>
            {couponLogin && (
              <div className={s.couponLogin} role="status">
                <p>
                  {ar
                    ? "سجّل الدخول لاسترداد القسيمة. تم حفظ حقيبتك."
                    : "Sign in to redeem your coupon. Your bag is saved."}
                </p>
                <Link href="/account/login?next=%2Fcheckout">
                  {ar ? "تسجيل الدخول" : "Sign in & continue"}
                </Link>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem("misk-coupon");
                    } catch {}
                    router.push("/checkout");
                  }}
                >
                  {ar ? "المتابعة بدون قسيمة" : "Continue without coupon"}
                </button>
              </div>
            )}
          </div>
        </section>
        <div className={s.introDistance} aria-hidden="true" />
        <div
          data-product-chapters
          data-object-sequence
          className={s.productChapters}
        >
          <SculptureScene />
          <AtelierPanel id="originales-story" art="fold">
            <div className={s.panelCopy}>
              <p className={s.kicker}>THE EXPRESSION / {edition.number}</p>
              <h2>{narrative?.heading ?? edition.name}</h2>
              {narrative && <p>{narrative.body}</p>}
              {product.shortDesc && (
                <p>{tx(product.shortDesc, product.shortDescAr, locale)}</p>
              )}
              <a
                href={
                  product.notes.length ? "#fragrance-notes" : "#the-discovery"
                }
                className={s.textLink}
              >
                {ar ? "اكتشف التفاصيل" : "A closer encounter"}
                <ArrowDown size={14} />
              </a>
            </div>
          </AtelierPanel>
          {product.notes.length > 0 && (
            <AtelierPanel
              id="fragrance-notes"
              art="orbit"
              className={s.compositionPanel}
            >
              <div className={s.compositionHeading}>
                <p className={s.kicker}>
                  {ar ? "التوليفة" : "THE COMPOSITION"}
                </p>
                <h2>
                  {ar ? "كل نوتة، لها حضور." : "A composition in three acts."}
                </h2>
              </div>
              <div className={s.noteColumns}>
                {(["top", "heart", "base"] as const).map((kind, index) => {
                  const notes = product.notes.filter((n) => n.kind === kind);
                  return notes.length ? (
                    <section key={kind}>
                      <header>
                        <small>0{index + 1}</small>
                        <h3>
                          {ar
                            ? { top: "البداية", heart: "القلب", base: "الأثر" }[
                                kind
                              ]
                            : {
                                top: "The opening",
                                heart: "The heart",
                                base: "The impression",
                              }[kind]}
                        </h3>
                      </header>
                      <div className={s.noteTiles}>
                        {notes.map((note) => (
                          <NoteTooltip
                            key={note.id}
                            note={note}
                            locale={locale}
                            className={s.noteTile}
                          >
                            <NoteGlyph
                              glyph={note.glyph}
                              className={s.noteGlyph}
                            />
                            <span>{tx(note.name, note.nameAr, locale)}</span>
                          </NoteTooltip>
                        ))}
                      </div>
                    </section>
                  ) : null;
                })}
              </div>
            </AtelierPanel>
          )}
          <AtelierPanel
            id="the-discovery"
            art="orbit"
            className={s.discoveryPanel}
          >
            <div className={s.panelCopy}>
              <p className={s.kicker}>THE DISCOVERY / ORIGINALES</p>
              <h2>
                {ar
                  ? "مساحة لاكتشاف آخر."
                  : "There is always more to discover."}
              </h2>
              <SamplePicker subtotal={price * safeQty} product />
            </div>
          </AtelierPanel>
          <AtelierPanel art="fold" className={s.offersPanel}>
            <div className={s.panelCopy}>
              <p className={s.kicker}>PRIVATE PRIVILEGES</p>
              <h2>{ar ? "تفصيل خاص بك." : "A considered extra."}</h2>
              <PdpOffers
                coupons={coupons}
                slug={product.slug}
                price={price * safeQty}
                quantity={safeQty}
                locale={locale}
              />
            </div>
          </AtelierPanel>
          <AtelierPanel art="orbit" className={s.storePanel}>
            <div className={s.sharedContent}>{stores}</div>
          </AtelierPanel>
          <AtelierPanel art="fold" className={s.reviewsPanel}>
            <div className={s.sharedContent}>{reviews}</div>
          </AtelierPanel>
        </div>
      </section>
      {mobileDock && (
        <div className={s.mobilePurchaseDock} data-mobile-purchase-dock>
          <div className={s.mobileDockIdentity}>
            <span>
              {variant?.nameOverride ?? edition.name}
              {safeQty > 1 ? ` · ×${safeQty}` : ""}
            </span>
            <span>{formatAED(price)}</span>
          </div>
          <div className={s.purchaseActions}>
            <AtelierBagButton
              added={added}
              disabled={stock <= 0}
              onClick={(e) => void purchase(e)}
              ar={ar}
              quantity={safeQty}
            />
            <button
              type="button"
              data-ios-haptic="on"
              className={s.buyButton}
              disabled={stock <= 0 || buyPending}
              onClick={(e) => void purchase(e, true)}
            >
              {buyPending
                ? ar
                  ? "جارٍ المتابعة…"
                  : "Continuing…"
                : ar
                  ? "اشتر الآن"
                  : "Purchase now"}
              <ArrowUpRight size={16} />
            </button>
          </div>
          {couponLogin && (
            <div className={s.mobileCouponLogin}>
              <Link href="/account/login?next=%2Fcheckout">
                {ar
                  ? "تسجيل الدخول لاسترداد القسيمة"
                  : "Sign in to redeem your coupon"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("misk-coupon");
                  } catch {}
                  router.push("/checkout");
                }}
              >
                {ar ? "المتابعة بدون قسيمة" : "Continue without coupon"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
