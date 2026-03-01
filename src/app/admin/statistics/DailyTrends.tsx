"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface DailyTrendsProps {
  chartData: Array<{
    date: string;
    Users: number;
    Payments: number;
    "Payment Amount": number;
    Studies: number;
  }>;
}

export function DailyTrends({ chartData }: DailyTrendsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Trends</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="amount">Amount</TabsTrigger>
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
          <TabsContent value="amount">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip wrapperClassName="!border-border !bg-background !text-foreground" />
                <Legend />
                <Bar dataKey="Payment Amount" fill="#ff7c7c" />
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
  );
}
