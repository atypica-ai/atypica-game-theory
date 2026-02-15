"use client";
import { AnalystKind } from "@/app/(study)/context/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudiesByKindProps {
  studiesByKind: Record<AnalystKind, number>;
}

export function StudiesByKind({ studiesByKind }: StudiesByKindProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Studies by Kind</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Object.entries(studiesByKind).map(([kind, count]) => (
            <li
              key={kind}
              className="flex justify-between items-center text-sm p-2 rounded bg-muted/50"
            >
              <span className="font-medium capitalize">{kind}</span>
              <span className="font-bold">{count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
