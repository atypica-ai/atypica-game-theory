"use client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AnalystKind } from "@/prisma/types";
import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DailyStatistics, fetchDailyStatistics } from "./actions";
import { UsersByCountry } from "./UsersByCountry";
import { UsersBySource } from "./UsersBySource";

// Set the initial date range to the last 14 days
const initialDateRange: DateRange = {
  from: addDays(new Date(), -14),
  to: new Date(),
};

export default function StatisticsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<DailyStatistics[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Get user's timezone
  const timezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setIsLoading(true);
    setError(null);

    const result = await fetchDailyStatistics(dateRange.from, dateRange.to, timezone);

    if (result.success) {
      setStats(result.data);
    } else {
      setError(result.message ?? "An unknown error occurred.");
    }
    setIsLoading(false);
  }, [dateRange, timezone]);

  // Fetch data on component mount and when the date range changes
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/statistics");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, dateRange, fetchData]);

  // Prepare data for the chart, reversing for chronological order
  const chartData = useMemo(() => {
    return stats
      .map((day) => ({
        date: format(new Date(day.date), "MM-dd"),
        Users: day.users.total,
        Payments: day.payments.total,
        Studies: day.studies.total,
      }))
      .reverse();
  }, [stats]);

  // Calculate totals for the selected period
  const totalStats = useMemo(() => {
    return stats.reduce(
      (acc, day) => {
        acc.users += day.users.total;
        acc.payments += day.payments.total;
        acc.studies += day.studies.total;

        for (const kind of Object.keys(acc.studiesByKind)) {
          acc.studiesByKind[kind as AnalystKind] += day.studies.byKind[kind as AnalystKind];
        }
        acc.feedback.useful += day.studies.byFeedback.useful;
        acc.feedback.not_useful += day.studies.byFeedback.not_useful;
        acc.feedback.no_feedback += day.studies.byFeedback.no_feedback;

        return acc;
      },
      {
        users: 0,
        payments: 0,
        studies: 0,
        studiesByKind: {
          [AnalystKind.testing]: 0,
          [AnalystKind.planning]: 0,
          [AnalystKind.insights]: 0,
          [AnalystKind.creation]: 0,
          [AnalystKind.productRnD]: 0,
          [AnalystKind.misc]: 0,
        },
        feedback: {
          useful: 0,
          not_useful: 0,
          no_feedback: 0,
        },
      },
    );
  }, [stats]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Platform Statistics</h1>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[260px] sm:w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex items-start">
                <div className="flex flex-col gap-1 border-r p-2">
                  <Button
                    onClick={() => {
                      const today = new Date();
                      setDateRange({ from: today, to: today });
                    }}
                    variant="ghost"
                    className="justify-start text-left font-normal"
                  >
                    Today
                  </Button>
                  <Button
                    onClick={() => {
                      const yesterday = addDays(new Date(), -1);
                      setDateRange({ from: yesterday, to: yesterday });
                    }}
                    variant="ghost"
                    className="justify-start text-left font-normal"
                  >
                    Yesterday
                  </Button>
                  <Button
                    onClick={() => setDateRange({ from: addDays(new Date(), -7), to: new Date() })}
                    variant="ghost"
                    className="justify-start text-left font-normal"
                  >
                    Last 7 days
                  </Button>
                  <Button
                    onClick={() => setDateRange({ from: addDays(new Date(), -30), to: new Date() })}
                    variant="ghost"
                    className="justify-start text-left font-normal"
                  >
                    Last 30 days
                  </Button>
                  <Button
                    onClick={() => setDateRange({ from: addDays(new Date(), -90), to: new Date() })}
                    variant="ghost"
                    className="justify-start text-left font-normal"
                  >
                    Last 90 days
                  </Button>
                </div>
                <div className="relative">
                  {isSelectingRange && (
                    <div className="absolute top-0 left-0 right-0 z-10 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-t-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        选择结束日期来完成日期范围选择
                      </p>
                    </div>
                  )}
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range, selectedDay) => {
                      if (!range) {
                        setDateRange(undefined);
                        setIsSelectingRange(false);
                        return;
                      }

                      // If we have a complete range and user clicks outside the range, start fresh
                      if (dateRange?.from && dateRange?.to && selectedDay && !isSelectingRange) {
                        const isClickingOutsideRange =
                          selectedDay < dateRange.from || selectedDay > dateRange.to;
                        if (isClickingOutsideRange) {
                          setDateRange({ from: selectedDay, to: undefined });
                          setIsSelectingRange(true);
                          return;
                        }
                      }

                      if (range?.from && range?.to) {
                        // Complete range selected
                        const diffTime = Math.abs(range.to.getTime() - range.from.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays > 365) {
                          // If range is too large, limit to 365 days
                          const limitedTo = addDays(range.from, 365);
                          setDateRange({ from: range.from, to: limitedTo });
                        } else {
                          setDateRange(range);
                        }
                        setIsSelectingRange(false);
                      } else if (range?.from && !range?.to) {
                        // Only start date selected
                        setDateRange(range);
                        setIsSelectingRange(true);
                      } else {
                        setDateRange(range);
                        setIsSelectingRange(false);
                      }
                    }}
                    numberOfMonths={2}
                    disabled={(date) => date > new Date() || date < addDays(new Date(), -730)}
                    className={cn(isSelectingRange && "mt-12")}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={fetchData} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
      )}

      {/* Total Stats Cards */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Totals for Selected Period</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">New Users</p>
            <p className="text-3xl font-bold">{totalStats.users.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Successful Payments</p>
            <p className="text-3xl font-bold">{totalStats.payments.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Studies</p>
            <p className="text-3xl font-bold">{totalStats.studies.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily Trends</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="studies">Studies</TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip wrapperClassName="!border-border !bg-background !text-foreground" />
                  <Legend />
                  <Bar dataKey="Users" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="payments">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip wrapperClassName="!border-border !bg-background !text-foreground" />
                  <Legend />
                  <Bar dataKey="Payments" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="studies">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip wrapperClassName="!border-border !bg-background !text-foreground" />
                  <Legend />
                  <Bar dataKey="Studies" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Study Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Studies by Kind</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(totalStats.studiesByKind).map(([kind, count]) => (
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
        <Card>
          <CardHeader>
            <CardTitle>Studies by Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex justify-between items-center text-sm p-2 rounded bg-green-100 dark:bg-green-900/30">
                <span className="font-medium">👍 Useful</span>
                <span className="font-bold">{totalStats.feedback.useful.toLocaleString()}</span>
              </li>
              <li className="flex justify-between items-center text-sm p-2 rounded bg-red-100 dark:bg-red-900/30">
                <span className="font-medium">👎 Not Useful</span>
                <span className="font-bold">{totalStats.feedback.not_useful.toLocaleString()}</span>
              </li>
              <li className="flex justify-between items-center text-sm p-2 rounded bg-gray-100 dark:bg-gray-700/30">
                <span className="font-medium">💬 No Feedback</span>
                <span className="font-bold">
                  {totalStats.feedback.no_feedback.toLocaleString()}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Daily Data Table */}
      <Card className="mb-6">
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

      {/* User Statistics - Independent Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsersByCountry dateRange={dateRange} timezone={timezone} />
        <UsersBySource dateRange={dateRange} timezone={timezone} />
      </div>
    </div>
  );
}
