import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth/next";
import HomePageClient from "./HomePageClient";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return <HomePageClient anonymous={!session?.user} />;
}
