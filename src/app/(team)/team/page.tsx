import { checkTezignAuth } from "@/app/admin/actions";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  await checkTezignAuth();
  redirect("/team/manage");
}
