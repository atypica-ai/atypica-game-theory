import { checkTezignAuth } from "@/app/admin/actions";
import IntroClient from "./IntroClient";

export default async function AtypicaIntro() {
  let showPresenterNotes = false;
  try {
    await checkTezignAuth();
    showPresenterNotes = true;
  } catch {
    showPresenterNotes = false;
  }

  return <IntroClient showPresenterNotes={showPresenterNotes} />;
}
