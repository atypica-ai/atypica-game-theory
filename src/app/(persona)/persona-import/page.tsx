import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import PersonaImportClient from "./PersonaImportClient";

export default async function PersonaImportPage() {
  // Check if user is superadmin to enable upload feature
  let isUploadEnabled = false;
  try {
    await checkAdminAuth([AdminPermission.MANAGE_PERSONAS]);
    isUploadEnabled = true;
  } catch {
    // User is not superadmin, upload remains disabled
    isUploadEnabled = false;
  }

  return <PersonaImportClient isUploadEnabled={isUploadEnabled} />;
}
