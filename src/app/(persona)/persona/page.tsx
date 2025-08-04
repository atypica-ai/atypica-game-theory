import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveUserSubscription } from "@/app/account/lib";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { getServerSession } from "next-auth";
import PersonaImportClient from "./PersonaImportClient";

export default async function PersonaHomePage() {
  // Check if user is superadmin to enable upload feature
  let isUploadEnabled = false;
  try {
    await checkAdminAuth([AdminPermission.MANAGE_PERSONAS]);
    isUploadEnabled = true;
  } catch {
    // User is not superadmin, upload remains disabled
    isUploadEnabled = false;
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const result = await fetchActiveUserSubscription({
        userId: session?.user?.id,
      });
      if (result.activeSubscription?.plan === "max") {
        isUploadEnabled = true;
      }
    }
  }

  return <PersonaImportClient isUploadEnabled={isUploadEnabled} />;
}
