"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DailyStatistics } from "./actions";

interface DailyBreakdownProps {
  stats: DailyStatistics[];
  isLoading: boolean;
}

export function DailyBreakdown({ stats, isLoading }: DailyBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[600px] rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">New Users</TableHead>
                <TableHead className="text-center">Payments</TableHead>
                <TableHead className="text-center">Studies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading statistics...
                  </TableCell>
                </TableRow>
              ) : stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No data available for this period.
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-center">{day.users.total}</TableCell>
                    <TableCell className="text-center">{day.payments.total}</TableCell>
                    <TableCell className="text-center">{day.studies.total}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
