import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function LegalLinks({ context }: { context: "account" | "checkout" }) {
  const t = useTranslations("Legal");
  return (
    <p className="mt-4 text-xs leading-relaxed text-espresso">
      {t.rich(context, {
        terms: (text) => <Link href="/pages/terms" target="_blank" rel="noopener" className="underline underline-offset-4">{text}</Link>,
        privacy: (text) => <Link href="/pages/privacy" target="_blank" rel="noopener" className="underline underline-offset-4">{text}</Link>,
      })}
    </p>
  );
}
