import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FaqAccordion,
  WishlistGrid,
} from "@/components/blocks/ContentBlocks";
import { ContactExperience, type ContactTopic } from "@/components/blocks/ContactExperience";
import { getProducts } from "@/lib/store";
import { getFaqs } from "@/lib/site";
// Static info pages — mirrors page.wholesale.json, page.contact.json,
// page.faq.json (+ remaining page.*.json templates).
const PAGES: Record<string, { title: string; eyebrow: string; html: string }> = {
  wholesale: {
    title: "Wholesale",
    eyebrow: "Trade",
    html: "<p><strong>Bulk orders accepting.</strong> Partner with Misk Al Ghazaal for retail and distribution of fine perfumes, dukhoon and bakhoor.</p><p>Write to <a href='mailto:gazaalperfumes@gmail.com'>gazaalperfumes@gmail.com</a> or visit our Mamzar Centre store in Dubai, UAE.</p>",
  },
  contact: { title: "Write to the Maison", eyebrow: "Correspondence", html: "" },
  faq: { title: "Questions, Answered", eyebrow: "Client Care", html: "" },
  wishlist: { title: "Wishlist", eyebrow: "Saved", html: "" },
  about: {
    title: "Our Story",
    eyebrow: "Maison Misk Al Ghazaal",
    html: "<p>Misk Al Ghazaal perfumes, dukhoon and holy oudh — crafted for the UAE. Direct from manufacturer: authentic, sealed at origin, and long-lasting.</p><p>Every order carries complimentary samples, 2–3 day delivery within the Emirates, and cash on delivery.</p>",
  },
  brands: {
    title: "Our Brands",
    eyebrow: "Maisons",
    html: "<p>Misk Al Ghazaal · Noorjes · Holy Oudh · plus our maison exclusive blends.</p>",
  },
  women: {
    title: "The Women's Edit",
    eyebrow: "Edit",
    html: "<p>Soft florals, white musk and rose picks — chosen for grace and lightness.</p>",
  },
  "new-arrivals": {
    title: "New Arrivals",
    eyebrow: "Edit",
    html: "<p>The latest seasonal drops from the maison.</p>",
  },
  terms: {
    title: "Returns & Terms",
    eyebrow: "Client Care",
    html: "<p>30-day returns on unopened items with receipt. Refunds return to the original payment method within 10–45 days depending on the issuing bank.</p><p>Damaged or incorrect items are always made right — write to gazaalperfumes@gmail.com.</p>",
  },
  sitemap: {
    title: "Sitemap",
    eyebrow: "Index",
    html: "<p>Shop, collections, journal, account and client-care pages.</p>",
  },
  "holy-oudh": {
    title: "Holy Oudh",
    eyebrow: "Rare Oils",
    html: "<p>Rare Hindi and Cambodi dehn al oud for connoisseurs.</p>",
  },
  "ramadan-offer": {
    title: "The Ramadan Offer",
    eyebrow: "Season",
    html: "<p>Festive bundles on Misk Al Ghazaal perfumes and bakhoors with complimentary UAE delivery.</p>",
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default async function StaticInfoPage(
  props: PageProps<"/pages/[slug]">
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const page = PAGES[slug];
  if (!page) notFound();

  const topicParam = searchParams?.topic;
  const initialTopic: ContactTopic | null =
    topicParam === "meeting" || topicParam === "review" || topicParam === "complaint"
      ? topicParam
      : null;
  const productList = (await getProducts()).map((p) => ({
    slug: p.slug,
    title: p.title,
  }));

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
      <p className="eyebrow text-center text-gold">{page.eyebrow}</p>
      <h1 className="mt-3 text-center font-display text-4xl text-ink md:text-5xl">
        {page.title}
      </h1>
      <span className="mx-auto mt-5 block h-px w-12 bg-gold-soft" />
      <div className="mt-10">
        {slug === "contact" && (
          <ContactExperience products={productList} initialTopic={initialTopic} />
        )}
        {slug === "faq" && <FaqAccordion items={getFaqs()} />}
        {slug === "wishlist" && <WishlistGrid products={await getProducts()} />}
        {slug !== "contact" && slug !== "faq" && slug !== "wishlist" && (
          <div
            className="prose max-w-none text-espresso"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        )}
      </div>
      {slug === "wholesale" && (
        <div className="mt-10 text-center">
          <Button asChild>
            <Link href="/pages/contact">Contact Now</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
