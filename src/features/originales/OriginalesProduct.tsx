"use client";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { formatAED } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { defaultVariant } from "@/lib/product-options";
import { flyToBag } from "@/lib/fly-to-bag";
import { VariantPicker } from "@/components/product/VariantPicker";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { NoteTooltip } from "@/components/product/NoteTooltip";
import { SamplePicker } from "@/components/blocks/SamplePicker";
import { atelierGsap } from "./atelier-gsap";
import { PRODUCT_FRAMES } from "./motion-config";
import { editionFor, originalesPath } from "./config";
import { editionStory } from "./story";
import { AtelierProductGallery } from "./AtelierProductGallery";
import { OriginalesLoading } from "./OriginalesLoading";
import { StudioAtmosphere } from "./StudioAtmosphere";
import { useAtelierScroll } from "./atelier-scroll";
import { FinaleDecor } from "./FinaleDecor";
import { AtelierPanel } from "./AtelierPanel";
import { AtelierBagButton, AtelierQuantity } from "./AtelierControls";
import s from "./atelier.module.css";

export function OriginalesProduct({
  product,
  locale,
  stores,
  reviews,
}: {
  product: Product;
  locale: Locale;
  stores: ReactNode;
  reviews: ReactNode;
}) {
  const ar = locale === "ar",
    edition = editionFor(product),
    narrative = editionStory(edition.name, ar);
  const smoother = useAtelierScroll();
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
    [mobileDock, setMobileDock] = useState(false),
    [photoFocus, setPhotoFocus] = useState(false);
  const [routePending, startPurchaseTransition] = useTransition();
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const variant =
      product.variants.find((v) => v.id === variantId) ??
      defaultVariant(product),
    stock = product.outOfStock ? 0 : (variant?.stock ?? Infinity),
    safeQty = Math.min(qty, Math.max(1, Math.min(20, stock))),
    price = variant?.price ?? product.price,
    bottle = edition.bottle ?? product.images[0] ?? "/mag.webp";
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
    const element = root.current;
    if (!ready || !element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => {
      if (element.dataset.studioIntro !== "complete")
        element.dataset.studioIntro = "complete";
    };
    if (window.scrollY > 24 || reduced.matches) {
      finish();
      return;
    }

    element.dataset.studioIntro = "playing";
    const timer = window.setTimeout(finish, 1750);
    const interrupt = () => {
      if (window.scrollY > 24 || reduced.matches) finish();
    };
    window.addEventListener("scroll", interrupt, { passive: true });
    reduced.addEventListener("change", interrupt);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", interrupt);
      reduced.removeEventListener("change", interrupt);
    };
  }, [ready, product.slug]);
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
    if (smoother === null) return;
    let live = true,
      dispose = () => {};
    Promise.all([atelierGsap(), import("gsap/ScrollTrigger")])
      .then(async ([{ gsap }, { ScrollTrigger }]) => {
        await document.fonts.ready;
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
            if (!context.conditions?.motion) return;
            if (context.conditions.mobile) {
              const node = root.current!;
              const scene = node.querySelector<HTMLElement>("[data-scene]")!;
              gsap.to(node.querySelectorAll("[data-bottle-reflection]"), {
                opacity: 0,
                y: 16,
                ease: "atelier-soft",
                scrollTrigger: {
                  trigger: scene,
                  start: "top top",
                  end: "top -24%",
                  scrub: 0.35,
                },
              });
              gsap.to(scene, {
                "--studio-motion-opacity": 0,
                ease: "atelier-soft",
                scrollTrigger: {
                  trigger: scene,
                  start: "top top",
                  end: "top -24%",
                  scrub: 0.35,
                },
              });
              return;
            }
            const node = root.current!,
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
              y: () => scene.clientHeight * 0.05,
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
              "--title-settle": 0,
              fontSize: "min(22vw, 32svh)",
              transformOrigin: "top left",
              x: 0,
              y: 0,
            });
            const display = title.querySelector<HTMLElement>(
              "[data-display-title]",
            )!;
            const titleFontSize = () =>
              parseFloat(getComputedStyle(title).fontSize);
            const openingWidthPerEm = display.offsetWidth / titleFontSize();
            gsap.set(title, {
              fontSize: `min(22vw, 32svh, ${86 / openingWidthPerEm}vw)`,
            });
            const openingPose = {
              x: () =>
                (scene.clientWidth - openingWidthPerEm * titleFontSize()) / 2,
              y: () => scene.clientHeight * 0.155,
              scale: 1,
            };
            gsap.set(title, openingPose);
            const destination = () => {
              const d = dock.getBoundingClientRect(),
                r = scene.getBoundingClientRect();
              return {
                x: d.left - r.left,
                y: d.top - r.top - (Number(gsap.getProperty(buy, "y")) || 0),
              };
            };
            const tl = gsap.timeline({
              defaults: { ease: "atelier-soft" },
              onUpdate: () => {
                const priceReady = String(tl.time() >= 0.95);
                const galleryVisible = String(tl.time() >= 0.63);
                if (node.dataset.priceReady !== priceReady)
                  node.dataset.priceReady = priceReady;
                if (node.dataset.galleryVisible !== galleryVisible)
                  node.dataset.galleryVisible = galleryVisible;
              },
              scrollTrigger: {
                trigger: node.querySelector("[data-runway]"),
                start: "top top",
                end: () => "+=" + innerHeight * PRODUCT_FRAMES.dock,
                scrub: 0.28,
                invalidateOnRefresh: true,
              },
            });
            tl.to(
              node.querySelectorAll("[data-bottle-reflection]"),
              {
                opacity: 0,
                y: 24,
                duration: 0.48,
              },
              0,
            );
            tl.to(
              scene,
              {
                "--studio-dim": 0.76,
                "--studio-motion-opacity": 0,
                duration: 0.86,
              },
              0,
            );
            const bottleNode =
              node.querySelector<HTMLElement>("[data-bottle]")!;
            const boxNode = node.querySelector<HTMLElement>("[data-box]")!;
            const dockedImageY = (object: HTMLElement) =>
              scene.clientHeight * -0.09 - object.offsetHeight * 0.05;
            const galleryPose = (
              object: HTMLElement,
              side: number,
              scale: number,
            ) => ({
              x: () => {
                const lane = scene.clientWidth - 100;
                return (
                  100 + lane * (0.26 + side * 0.075) - scene.clientWidth / 2
                );
              },
              y: () => dockedImageY(object) + scene.clientHeight * 0.1,
              scale,
              duration: 0.85,
            });
            tl.to(bottleNode, galleryPose(bottleNode, 1, 0.96), 0.05);
            tl.fromTo(
              boxNode,
              { opacity: 0, x: -scene.clientWidth * 0.36, scale: 0.76 },
              { ...galleryPose(boxNode, -1, 0.94), opacity: 1, duration: 0.7 },
              0.23,
            );
            tl.fromTo(
              title,
              openingPose,
              {
                x: () => destination().x,
                y: () => destination().y,
                scale: () =>
                  Math.min(43, scene.clientWidth * 0.035) / titleFontSize(),
                "--title-settle": 1,
                duration: 0.8,
              },
              0.15,
            );
            tl.fromTo(
              title,
              { fontWeight: 800, letterSpacing: "-0.045em" },
              {
                fontWeight: 400,
                letterSpacing: "0.025em",
                duration: 0.22,
              },
              0.73,
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
            gsap.set(buy, {
              width: () => Math.min(scene.clientWidth * 0.36, 485),
              right: "auto",
              maxWidth: "none",
            });
            // Dock the same live controls beneath the same persistent bottle/box nodes.
            const compact = gsap.timeline({
              onUpdate: () => {
                const docked = compact.progress() > 0.55;
                if (node.dataset.docked === String(docked)) return;
                node.dataset.docked = String(docked);
                const details = node.querySelector<HTMLElement>(
                  "[data-purchase-details]",
                );
                if (details) details.inert = docked;
              },
            });
            compact.to(
              buy,
              {
                left: () => 100 + (scene.clientWidth - 100) * 0.045,
                width: () => (scene.clientWidth - 100) * 0.43,
                top: "72%",
                paddingTop: 32,
                "--dock-progress": 1,
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
              bottleNode,
              { y: () => dockedImageY(bottleNode), duration: 1 },
              0,
            );
            compact.to(
              boxNode,
              { y: () => dockedImageY(boxNode), duration: 1 },
              0,
            );
            compact.to(scene, { "--gallery-drop": "0%", duration: 1 }, 0);
            tl.fromTo(
              node.querySelector("[data-product-gallery]"),
              {
                autoAlpha: 0,
                x: 32,
              },
              {
                autoAlpha: 1,
                x: 0,
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
              delete node.dataset.galleryVisible;
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
  }, [product.slug, smoother]);
  const purchase = async (
    event: React.MouseEvent<HTMLButtonElement>,
    now = false,
  ) => {
    if (stock <= 0 || buyPending || routePending) return;
    if (now && couponLogin) {
      let savedCode = "";
      try {
        savedCode = localStorage.getItem("misk-coupon") ?? "";
      } catch {}
      startPurchaseTransition(() =>
        router.push(
          savedCode ? "/account/login?next=%2Fcheckout" : "/checkout",
        ),
      );
      return;
    }
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
            data: { session },
          } = await createClient().auth.getSession();
          if (!session?.user) {
            setCouponLogin(true);
            setBuyPending(false);
            return;
          }
        } catch {}
      }
      startPurchaseTransition(() => router.push("/checkout"));
      setBuyPending(false);
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
      data-originales-product
      data-originales-route={originalesPath(product)}
      data-originales-ready={ready}
      data-studio-intro="pending"
      data-photo-focus={photoFocus}
      className={`${s.product} ${s.stickyProduct}`}
      style={
        {
          "--edition-accent": edition.accent,
          "--edition-wash": edition.wash,
          "--edition-ink": edition.ink,
          "--reflection-seam": edition.reflectionSeam,
        } as CSSProperties
      }
    >
      <OriginalesLoading phase={ready ? "arrived" : "arrival"} />
      <section data-runway className={`${s.runway} ${s.fullExperience}`}>
        <section
          ref={stage}
          data-scene
          className={s.scene}
          aria-label={edition.name}
        >
          <StudioAtmosphere
            variant={edition.number}
            ink={edition.ink}
            accent={edition.accent}
            wash={edition.wash}
          />
          <div className={s.heroHalo} />
          <h1 data-static-ink data-travelling-title className={s.frostedTitle}>
            <span data-display-title className={s.displayTitle}>
              <span>{variant?.nameOverride ?? edition.name}</span>
            </span>
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
            {edition.bottle && (
              <div
                data-bottle-reflection
                className={s.bottleReflection}
                aria-hidden="true"
              >
                <Image
                  src={bottle}
                  alt=""
                  fill
                  sizes="(max-width:759px) 65vw, 34vw"
                  className="object-contain"
                />
              </div>
            )}
          </div>
          <a
            data-scroll-cue
            className={s.scrollCue}
            href="#originales-purchase"
            onClick={(e) => {
              e.preventDefault();
              if (innerWidth < 760) {
                root.current?.querySelector("[data-purchase]")?.scrollIntoView({
                  behavior: matchMedia("(prefers-reduced-motion:reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                  block: "start",
                });
                return;
              }
              const r = root.current
                ?.querySelector("[data-runway]")
                ?.getBoundingClientRect();
              if (r)
                scrollTo({
                  top:
                    (smoother ? smoother.scrollTop() : scrollY) +
                    r.top +
                    innerHeight * PRODUCT_FRAMES.price,
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
            name={variant?.nameOverride ?? edition.name}
            ar={ar}
            onFocusChange={setPhotoFocus}
          />
          <div
            id="originales-purchase"
            data-purchase
            data-static-ink
            className={s.purchase}
            inert={mobileDock || photoFocus || undefined}
          >
            <div className={s.compactIdentity}>
              <span>{variant?.nameOverride ?? edition.name}</span>
              <span>{formatAED(price)}</span>
            </div>
            <div data-purchase-details className={s.purchaseDetails}>
              <p className={s.kicker}>MAG PARFUM</p>
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
              <AtelierBagButton
                action="purchase"
                requiresLogin={couponLogin}
                added={false}
                pending={buyPending || routePending}
                disabled={stock <= 0 || buyPending || routePending}
                onClick={(e) => void purchase(e, true)}
                ar={ar}
              />
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
        <div data-product-chapters className={s.productChapters}>
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
                <h2>{ar ? "التوليفة" : "The composition."}</h2>
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
          <AtelierPanel art="orbit" className={s.storePanel}>
            <div className={s.sharedContent}>{stores}</div>
          </AtelierPanel>
          <AtelierPanel art="fold" className={s.reviewsPanel}>
            <div className={s.sharedContent}>{reviews}</div>
            <FinaleDecor />
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
            <AtelierBagButton
              action="purchase"
              requiresLogin={couponLogin}
              added={false}
              pending={buyPending || routePending}
              disabled={stock <= 0 || buyPending || routePending}
              onClick={(e) => void purchase(e, true)}
              ar={ar}
            />
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
