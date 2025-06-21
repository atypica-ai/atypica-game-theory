import { checkTezignAuth } from "@/app/admin/actions";
import { ScoutChat } from "./ScoutChat";

export const dynamic = "force-dynamic";

export default async function ScoutPage() {
  await checkTezignAuth();
  return <ScoutChat />;
}
