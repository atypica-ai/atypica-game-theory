import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import LandingPageClient from "./LandingPageClient";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return <LandingPageClient anonymous={!session?.user} />;
}
