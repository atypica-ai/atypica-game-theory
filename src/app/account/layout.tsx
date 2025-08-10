import GlobalHeader from "@/components/layout/GlobalHeader";
import AccountSidebar from "./components/AccountSidebar";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex flex-col items-stretch justify-start overflow-hidden">
      <GlobalHeader />
      <div className="flex-1 overflow-hidden flex flex-col sm:flex-row items-stretch justify-start">
        <AccountSidebar />
        <main className="w-full sm:h-full sm:w-auto flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
