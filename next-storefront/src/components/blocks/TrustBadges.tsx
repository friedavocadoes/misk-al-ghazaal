import { Banknote, RotateCcw, Truck, Sparkles } from "lucide-react";

const ITEMS = [
  { icon: Truck, title: "Free Shipping & Samples", desc: "On orders above 200 AED" },
  { icon: Sparkles, title: "2-3 Days Delivery", desc: "Within UAE" },
  { icon: Banknote, title: "Cash On Delivery", desc: "Available within UAE" },
  { icon: RotateCcw, title: "7 Days Return", desc: "Returns within 7 days" },
];

export function TrustBadges() {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <div key={item.title} className="flex items-start gap-2.5">
          <item.icon className="mt-0.5 size-5 shrink-0 text-emerald-900" />
          <div>
            <p className="text-xs font-semibold text-stone-900">{item.title}</p>
            <p className="text-[11px] text-stone-500">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
