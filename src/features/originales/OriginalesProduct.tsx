"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
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
import { DeviceBannerImage } from "@/components/blocks/DeviceBannerImage";
import { editionFor } from "./config";
import { LiquidName } from "./LiquidName";
import s from "./originales.module.css";

const FluidSurface = dynamic(() => import("./FluidSurface"), { ssr: false });

export function OriginalesProduct({
  product,
  coupons,
  locale,
  children,
}: {
  product: Product;
  coupons: Coupon[];
  locale: Locale;
  children: ReactNode;
}) {
  const ar = locale === "ar";
  const edition = editionFor(product);
  const router = useRouter();
  const { add } = useCart();
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [variantId, selectVariant] = useState(defaultVariant(product)?.id);
  const variant =
    product.variants.find((v) => v.id === variantId) ?? defaultVariant(product);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buyPending, setBuyPending] = useState(false);
  const [couponLogin, setCouponLogin] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stock = product.outOfStock ? 0 : (variant?.stock ?? Infinity);
  const safeQty = Math.min(qty, Math.max(1, Math.min(20, stock)));
  const bottle = edition.bottle ?? product.images[0] ?? "/logo.webp";
  const backdrop =
    product.notesImageDesktop || product.notesImageMobile || edition.backdrop;
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      if (live) setReady(true);
    }, 2200);
    const images = Array.from(
      stage.current?.querySelectorAll<HTMLImageElement>(
        "[data-arrival] img, img[data-arrival]",
      ) ?? [],
    );
    Promise.all(images.map((image) => image.decode().catch(() => {}))).then(
      () => {
        if (live) setReady(true);
      },
    );
    return () => {
      live = false;
      clearTimeout(timer);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [product.slug]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let cancelled = false;
    let destroy = () => {};
    // Load the animation code only on this route; native sticky supplies all layout.
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ default: gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add(
          {
            motion: "(prefers-reduced-motion: no-preference)",
            mobile: "(max-width: 759px)",
            desktop: "(min-width:760px)",
          },
          (context) => {
            if (!context.conditions?.motion) return;
            const mobile = !!context.conditions.mobile;
            const scene = element.querySelector<HTMLElement>("[data-scene]");
            const buy = element.querySelector<HTMLElement>("[data-purchase]");
            if (!scene || !buy) return;
            gsap.set(element.querySelector("[data-bottle]"), {
              xPercent: -50,
              yPercent: mobile ? -44 : -42,
              x: 0,
              y: 0,
            });
            gsap.set(element.querySelector("[data-box]"), {
              xPercent: -50,
              yPercent: -42,
              x: 0,
              y: 0,
            });
            gsap.set(element.querySelector("[data-liquid-title]"), {
              xPercent: -50,
              x: 0,
            });
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: element.querySelector("[data-runway]"),
                start: "top top",
                end: "bottom bottom",
                scrub: 1.15,
                invalidateOnRefresh: true,
              },
            });
            timeline.to(
              scene,
              { "--assembly": 1, duration: 1, ease: "none" },
              0,
            );
            timeline.to(
              element.querySelectorAll("[data-ingredient]"),
              {
                x: 0,
                y: 0,
                scale: 0.04,
                opacity: 0,
                stagger: 0.025,
                duration: 0.32,
                ease: "power2.in",
              },
              0.04,
            );
            timeline.to(
              element.querySelector("[data-bottle]"),
              {
                x: () => (mobile ? 0 : -scene.clientWidth * 0.21),
                y: () =>
                  mobile
                    ? -scene.clientHeight * 0.12
                    : scene.clientHeight * 0.03,
                scale: mobile ? 0.67 : 0.88,
                rotate: -3,
                duration: 0.5,
                ease: "power3.inOut",
              },
              0.48,
            );
            timeline.fromTo(
              element.querySelector("[data-box]"),
              { opacity: 0, x: mobile ? -170 : -360, rotate: -12, scale: 0.82 },
              {
                opacity: 1,
                x: () =>
                  mobile
                    ? -scene.clientWidth * 0.18
                    : -scene.clientWidth * 0.33,
                y: () => (mobile ? -scene.clientHeight * 0.08 : 0),
                rotate: -7,
                scale: mobile ? 0.65 : 0.88,
                duration: 0.5,
                ease: "power3.inOut",
              },
              0.42,
            );
            timeline.to(
              element.querySelector("[data-liquid-title]"),
              {
                opacity: 0,
                y: -45,
                scale: 0.85,
                duration: 0.38,
                ease: "power2.inOut",
              },
              0.22,
            );
            timeline.to(
              element.querySelector("[data-scroll-cue]"),
              { autoAlpha: 0, duration: 0.2 },
              0.3,
            );
            timeline.fromTo(
              buy,
              { opacity: 0, y: 40 },
              {
                opacity: 1,
                y: 0,
                duration: 0.35,
                ease: "power3.out",
                onStart: () => {
                  buy.inert = false;
                },
                onReverseComplete: () => {
                  buy.inert = true;
                },
              },
              0.68,
            );
            buy.inert = true;
            const notes =
              element.querySelectorAll<HTMLElement>("[data-ingredient]");
            notes.forEach((note, index) =>
              gsap.set(note, {
                xPercent: -50,
                yPercent: -50,
                x: () =>
                  (index % 2 ? 1 : -1) *
                  scene.clientWidth *
                  (0.23 + (index % 3) * 0.08),
                y: () => ((index % 3) - 1) * scene.clientHeight * 0.24,
              }),
            );
            ScrollTrigger.refresh();
            return () => {
              buy.inert = false;
            };
          },
          element,
        );
        destroy = () => mm.revert();
      })
      .catch(() => {
        /* Static presentation and purchase controls remain usable. */
      });
    return () => {
      cancelled = true;
      destroy();
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
        } catch {
          /* Checkout will validate the saved code. */
        }
      }
      router.push("/checkout");
      return;
    }
    flyToBag(event.currentTarget, bottle);
    setAdded(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setAdded(false), 1800);
  };
  return (
    <div
      ref={root}
      key={product.slug}
      className={s.product}
      style={
        {
          "--edition-accent": edition.accent,
          "--edition-wash": edition.wash,
          "--edition-ink": edition.ink,
        } as CSSProperties
      }
    >
      <div className={s.arrival} data-ready={ready} aria-hidden="true">
        <span className={s.arrivalMark}>O</span>
        <span>MAG PARFUM</span>
        <small>ORIGINALES / {edition.number}</small>
      </div>
      <section data-runway className={s.runway}>
        <section
          ref={stage}
          data-scene
          className={s.scene}
          aria-label={edition.name}
        >
          {backdrop && (
            <div className={s.notesBackdrop} data-arrival>
              <DeviceBannerImage
                src={backdrop}
                fallback={edition.backdrop ?? backdrop}
                mobileSrc={product.notesImageMobile || undefined}
                mobileFallback={edition.backdrop ?? backdrop}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
          )}
          <div className={s.atmosphere} />
          <FluidSurface color={edition.accent} />
          <div className={s.sceneCaption}>
            <span>ORIGINALES / {edition.number}</span>
            <span>{ar ? "تكوينٌ يتجلّى" : "A composition, becoming."}</span>
          </div>
          <div className={s.liquidTitle} data-liquid-title aria-hidden="true">
            <LiquidName name={edition.name} />
          </div>
          <div className={s.ingredients} aria-hidden="true">
            {product.notes.slice(0, 8).map((note, index) => (
              <span
                key={`${note.id}-${index}`}
                data-ingredient
                className={s.ingredient}
                style={
                  {
                    "--float-delay": `${-index * 1.7}s`,
                    "--note-color": note.color,
                    left: "50%",
                    top: "50%",
                  } as CSSProperties
                }
              >
                <span className={s.ingredientFloat}>
                  <NoteGlyph glyph={note.glyph} className={s.ingredientGlyph} />
                  <span>{tx(note.name, note.nameAr, locale)}</span>
                </span>
              </span>
            ))}
          </div>
          <div className={s.boxObject} data-box>
            {edition.box && (
              <Image
                src={edition.box}
                alt={`${edition.name} presentation box`}
                fill
                sizes="(max-width:760px) 44vw, 29vw"
                className="object-contain"
              />
            )}
          </div>
          <div className={s.bottleObject} data-bottle data-arrival>
            <Image
              src={bottle}
              alt={`${edition.name} — Originales by MAG Parfum`}
              fill
              priority
              sizes="(max-width:760px) 66vw, 34vw"
              className="object-contain"
            />
          </div>
          <a
            data-scroll-cue
            className={s.sceneScroll}
            href="#originales-purchase"
            onClick={(event) => {
              event.preventDefault();
              const r = root.current
                ?.querySelector("[data-runway]")
                ?.getBoundingClientRect();
              if (r)
                window.scrollTo({
                  top: scrollY + r.bottom - innerHeight,
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                });
            }}
          >
            {ar ? "اكتشف العطر" : "Scroll to compose"}
            <ArrowDown size={16} />
          </a>
          <div id="originales-purchase" data-purchase className={s.purchase}>
            <p className={s.kicker}>MAG PARFUM — ORIGINALES</p>
            <h1>{variant?.nameOverride ?? edition.name}</h1>
            {product.notes.length > 0 && (
              <p className={s.purchaseNotes}>
                {product.notes
                  .slice(0, 3)
                  .map((n) => tx(n.name, n.nameAr, locale))
                  .join(" · ")}
              </p>
            )}
            <p className={s.price}>
              {formatAED(variant?.price ?? product.price)}
            </p>
            <VariantPicker
              product={product}
              variant={variant}
              onSelect={selectVariant}
              ar={ar}
            />
            <div className={s.purchaseActions}>
              <div className={s.quantity}>
                <button
                  type="button"
                  data-ios-haptic="on"
                  aria-label={ar ? "تقليل الكمية" : "Decrease quantity"}
                  disabled={safeQty <= 1}
                  onClick={() => setQty(safeQty - 1)}
                >
                  <Minus size={15} />
                </button>
                <span>{safeQty}</span>
                <button
                  type="button"
                  data-ios-haptic="on"
                  aria-label={ar ? "زيادة الكمية" : "Increase quantity"}
                  disabled={safeQty >= Math.min(20, stock)}
                  onClick={() => setQty(safeQty + 1)}
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                data-ios-haptic="on"
                type="button"
                className={s.addButton}
                disabled={stock <= 0}
                onClick={(event) => purchase(event)}
              >
                {added ? <Check size={17} /> : <ShoppingBag size={17} />}
                <span aria-live="polite">
                  {stock <= 0
                    ? ar
                      ? "نفد المخزون"
                      : "Out of stock"
                    : added
                      ? ar
                        ? "أضيف إلى الحقيبة"
                        : "Added to your bag"
                      : ar
                        ? "أضف إلى الحقيبة"
                        : "Add to bag"}
                </span>
              </button>
            </div>
            <button
              data-ios-haptic="on"
              className={s.buyButton}
              type="button"
              disabled={stock <= 0 || buyPending}
              onClick={(event) => purchase(event, true)}
            >
              {buyPending
                ? ar
                  ? "جارٍ المتابعة…"
                  : "Continuing…"
                : ar
                  ? "اشتر الآن"
                  : "Make it yours"}
              <ArrowUpRight size={17} />
            </button>
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
            <a href="#originales-story" className={s.storyLink}>
              {ar ? "حكاية التوليفة" : "Discover the composition"}
              <ArrowDown size={13} />
            </a>
          </div>
        </section>
      </section>
      <section id="originales-story" className={s.story}>
        <p className={s.kicker}>
          {ar ? "تعبير أصيل" : "The expression"} / {edition.number}
        </p>
        <h2>
          {edition.name}.<br />
          <span>{ar ? "حضور لا يشبه سواه." : "A world of its own."}</span>
        </h2>
        {product.shortDesc ? (
          <p className={s.storyCopy}>
            {tx(product.shortDesc, product.shortDescAr, locale)}
          </p>
        ) : product.descriptionHtml ? (
          <div
            className={s.storyCopy}
            dangerouslySetInnerHTML={{
              __html:
                ar && product.descriptionAr
                  ? product.descriptionAr
                  : product.descriptionHtml,
            }}
          />
        ) : (
          <p className={s.storyCopy}>
            {ar
              ? "اكتشف تفاصيل التوليفة، من الانطباع الأول إلى النوتات التي تبقى."
              : "Explore the composition, from its first impression to the notes that stay with you."}
          </p>
        )}
        {product.notes.length > 0 && (
          <a href="#fragrance-notes" className={s.storyLink}>
            {ar ? "تعرّف على النوتات" : "Meet the notes"}
            <ArrowDown size={15} />
          </a>
        )}
      </section>
      {product.notes.length > 0 && (
        <section id="fragrance-notes" className={s.composition}>
          <div className={s.compositionHeading}>
            <p className={s.kicker}>
              {ar ? "داخل التوليفة" : "Inside the composition"}
            </p>
            <h2>{ar ? "كل نوتة، لها حضور." : "Every note. A presence."}</h2>
            <p>
              {ar
                ? "المس نوتة لاكتشافها."
                : "Touch a note to discover its character."}
            </p>
          </div>
          <div className={s.noteColumns}>
            {(["top", "heart", "base"] as const).map((kind, index) => {
              const notes = product.notes.filter((n) => n.kind === kind);
              return (
                <section key={kind}>
                  <header>
                    <span>0{index + 1}</span>
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
                          className={s.compositionGlyph}
                        />
                        <span>{tx(note.name, note.nameAr, locale)}</span>
                        <Plus size={12} />
                      </NoteTooltip>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      )}
      <div className={s.extras}>
        <SamplePicker
          subtotal={(variant?.price ?? product.price) * safeQty}
          product
        />
        <PdpOffers
          coupons={coupons}
          slug={product.slug}
          price={(variant?.price ?? product.price) * safeQty}
          quantity={safeQty}
          locale={locale}
        />
        {children}
      </div>
    </div>
  );
}
