import AccountLayout from "@/app/account/layout";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team");

  return {
    title: t("Layout.title"),
    description: t("Layout.description"),
  };
}

export default async function TeamManageLayout({ children }: { children: ReactNode }) {
  // return (
  //   <div className="pt-16 min-h-dvh flex flex-col items-stretch justify-start overflow-y-auto scrollbar-thin">
  //     <GlobalHeader className="h-16 fixed top-0 left-0 right-0 z-10" />
  //     {children}
  //   </div>
  // );
  return <AccountLayout>{children}</AccountLayout>;
}
