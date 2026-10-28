import { GET as processNotifications } from "../../notifications/process/route";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
/** Schedule GET every minute with Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  return processNotifications(req);
}
