import { redirect } from "next/navigation";

export default async function LegacyPersonaImportPageRedirect() {
  redirect("/persona");
}
