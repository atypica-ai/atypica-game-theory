import { checkTezignAuth } from "@/app/admin/actions";
import AboutClient from "./AboutClient";

export default async function About() {
  let showPresenterNotes = false;
  try {
    await checkTezignAuth();
    showPresenterNotes = true;
  } catch {
    showPresenterNotes = false;
  }

  return <AboutClient showPresenterNotes={showPresenterNotes} />;
}
