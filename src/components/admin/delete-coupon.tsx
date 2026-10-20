import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { deleteCoupon } from "@/app/admin/coupons/actions";

export function DeleteCoupon({ id, code }: { id: string; code: string }) {
  return <details className="p-4 text-sm">
    <summary className="cursor-pointer text-[#9c2b2e]">Delete coupon</summary>
    <p className="mt-3 max-w-md text-xs leading-relaxed text-ink/60">Permanently delete {code} and its redemption records? Existing orders and their saved discounts stay unchanged. Turn the coupon off instead if you want to retain its usage history.</p>
    <AdminForm action={deleteCoupon} className="mt-3" success="Coupon deleted">
      <input type="hidden" name="id" value={id} />
      <ActionButton danger ariaLabel={`Permanently delete coupon ${code}`}>Permanently delete {code}</ActionButton>
    </AdminForm>
  </details>;
}
