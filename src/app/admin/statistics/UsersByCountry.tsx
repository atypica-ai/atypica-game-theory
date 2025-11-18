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
import { RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { fetchUsersByCountry, UsersByCountry as UsersByCountryType } from "./actions";

interface UsersByCountryProps {
  dateRange: DateRange | undefined;
}

export function UsersByCountry({ dateRange }: UsersByCountryProps) {
  const [data, setData] = useState<UsersByCountryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchUsersByCountry(dateRange.from, dateRange.to);

        if (!result.success) {
          setError(result.message ?? "Failed to fetch users by country");
          return;
        }

        setData(result.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dateRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users by Country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCwIcon className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users by Country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  const totalUsers = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users by Country ({totalUsers.toLocaleString()} total)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={item.country}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{item.country}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {((item.count / totalUsers) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
