import { LeftMenus } from "@/app/(public)/LeftMenu";
import GlobalHeader from "@/components/GlobalHeader";
import PersonasClient from "./PersonasClient";

export default async function PersonasPage() {
  return (
    <div className="h-dvh flex flex-col items-stretch justify-start">
      <GlobalHeader leftMenus={<LeftMenus />} />
      <PersonasClient />
    </div>
  );
}
