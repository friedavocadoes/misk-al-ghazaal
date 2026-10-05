import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ContactBlocks,
  FaqAccordion,
  WishlistGrid,
} from "@/components/blocks/ContentBlocks";
import { products } from "@/lib/mock-data";

// Static info pages — mirrors page.wholesale.json, page.contact.json,
// page.faq.json (+ remaining page.*.json templates).
const PAGES: Record<string, { title: string; html: string }> = {
  wholesale: {
    title: "Wholesale — Bulk Orders Accepting",
    html: "<p><strong>Bulk orders accepting!</strong> Partner with Gazaal for retail and distribution of Misk Al Ghazaal perfumes, dukhoon and bakhoor.</p><p>Contact us at <a href='mailto:gazaalperfumes@gmail.com'>gazaalperfumes@gmail.com</a> or visit our Mamzar Centre store (Ajman? Dubai, UAE — Al Qiyadah Metro Station, Mamzar Centre, ground floor shop no 8).</p><p>See our privacy & terms notice in-store for data handling details.</p>",
  },
  contact: { title: "Contact", html: "" },
  faq: { title: "FAQ & Shipping", html: "" },
  wishlist: { title: "Wishlist", html: "" },
  about: {
    title: "About Gazaal",
    html: "<p>Misk Al Ghazaal perfumes, dukhoon and holy oudh — crafted for the UAE. Direct from manufacturer, authentic and long-lasting.</p>",
  },
  brands: {
    title: "Our Brands",
    html: "<p>Misk Al Ghazaal · Noorjes · Holy Oudh · Gazaal exclusive blends.</p>",
  },
  women: {
    title: "Women's Edit",
    html: "<p>Soft florals, white musk and rose picks.</p>",
  },
  "new-arrivals": {
    title: "New Arrivals",
    html: "<p>The latest seasonal drops.</p>",
  },
  terms: {
    title: "Returns & Terms",
    html: "<p>30-day returns on unopened items with receipt. Refunds to original payment method within 10–45 days depending on bank.</p>",
  },
  sitemap: {
    title: "Sitemap",
    html: "<p>Shop, collections, blog, account and support pages.</p>",
  },
  "holy-oudh": {
    title: "Holy Oudh",
    html: "<p>Rare Hindi and Cambodi dehn al oud for connoisseurs.</p>",
  },
  "ramadan-offer": {
    title: "Ramadan Bakhoor Offer",
    html: "<p>Special Ramadan bundles on Misk Al Ghazaal perfumes and bakhoors with free UAE delivery.</p>",
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

const FAQ_ITEMS = [
  {
    q: "How long does delivery take?",
    a: "1–3 working days within UAE, up to 5 days for remote areas. Middle East shipping 5–15 days.",
  },
  {
    q: "What are the shipping charges?",
    a: "Free above AED 400, AED 26 standard below AED 400.",
  },
  {
    q: "Can I pay cash on delivery?",
    a: "Yes, COD is available within the UAE.",
  },
  {
    q: "What is your return policy?",
    a: "Unopened items within 7 days (30 days with receipt for eligible items). Contact gazaalperfumes@gmail.com.",
  },
];

export default async function StaticInfoPage(
  props: PageProps<"/pages/[slug]">
) {
  const { slug } = await props.params;
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-center text-3xl font-bold text-stone-900">
        {page.title}
      </h1>
      <div className="mt-8">
        {slug === "contact" && <ContactBlocks />}
        {slug === "faq" && <FaqAccordion items={FAQ_ITEMS} />}
        {slug === "wishlist" && <WishlistGrid products={products} />}
        {slug !== "contact" && slug !== "faq" && slug !== "wishlist" && (
          <div
            className="prose max-w-none text-stone-600"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        )}
      </div>
      {slug === "wholesale" && (
        <div className="mt-8 text-center">
          <Button asChild>
            <Link href="/pages/contact">Contact Now</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
