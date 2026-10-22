import "server-only";
import { createAdminClient } from "./supabase/service";
import { revalidateHome, revalidateProductPaths, revalidatePagePaths } from "./revalidate";

/** SQL enforces a cross-instance five-minute lock. Runs outside customer responses. */
export async function refreshDemandRanking(force=false) {
  const {data,error}=await createAdminClient().rpc("refresh_product_demand",{p_force:force});
  if(error){
    // Deploys may precede the migration; never interrupt checkout/analytics.
    if(error.code!=="PGRST202")console.error("Demand ranking refresh failed:",error.message);
    return;
  }
  if(!data?.refreshed)return;
  for(const slug of (data.slugs??[]) as string[])revalidateProductPaths(slug);
  revalidateHome(); revalidatePagePaths("/collection/[slug]");revalidatePagePaths("/search");
}
