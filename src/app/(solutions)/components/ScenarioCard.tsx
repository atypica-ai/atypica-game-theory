import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface ScenarioCardProps {
  question: string;
  toolLabel: string;
  toolIcon: LucideIcon;
  href: string;
}

export function ScenarioCard({ question, toolLabel, toolIcon: Icon, href }: ScenarioCardProps) {
  return (
    <div className="group relative bg-card rounded-2xl overflow-hidden border flex flex-col h-full">
      <div className="relative flex flex-col h-full p-5 sm:p-6 transition-all duration-300">
        <h3 className="text-lg md:text-xl font-medium leading-snug text-card-foreground">
          {question}
        </h3>
        <div className="flex-1 min-h-[30px] md:min-h-10" />
        <Button variant="default" size="lg" className="rounded-full" asChild>
          <Link href={href} prefetch={true}>
            <Icon className="size-4" />
            <span>{toolLabel}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
