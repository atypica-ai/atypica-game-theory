"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
// import { zodResolver } from "@hookform/resolvers/zod";
// see https://github.com/react-hook-form/resolvers/issues/768
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";
import { getCurrentMaintenanceSchedule, upsertMaintenanceSchedule } from "./actions";

// Date utilities for timezone handling
const formatDateForInput = (date: Date): string => {
  // Format date in local timezone for datetime-local input
  const pad = (num: number) => String(num).padStart(2, "0");
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const parseLocalDateTime = (dateString: string): Date => {
  // Parse the local datetime string to a Date object
  return new Date(dateString);
};

// Create schema for form validation
const maintenanceFormSchema = z.object({
  isActive: z.boolean(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date and time",
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date and time",
  }),
  notificationTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date and time",
  }),
  affectedAreas: z.string().min(1, "Please describe the affected areas"),
  maintenanceMessage: z.string().min(1, "Please provide a maintenance message"),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

export default function MaintenancePage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize the form
  const form = useForm<MaintenanceFormValues>({
    resolver: standardSchemaResolver(maintenanceFormSchema),
    defaultValues: {
      isActive: false,
      startTime: formatDateForInput(new Date(Date.now() + 3600000)), // Default to 1 hour from now
      endTime: formatDateForInput(new Date(Date.now() + 7200000)), // Default to 2 hours from now
      notificationTime: formatDateForInput(new Date(Date.now())), // Default to now
      affectedAreas: "All system features",
      maintenanceMessage: "We're performing scheduled maintenance. Please check back soon.",
    },
  });

  // Fetch current maintenance schedule on load
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/maintenance");
    } else if (status === "authenticated") {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const result = await getCurrentMaintenanceSchedule();
          if (result.success && result.data) {
            const schedule = result.data;
            form.reset({
              isActive: schedule.isActive,
              startTime: formatDateForInput(new Date(schedule.startTime)),
              endTime: formatDateForInput(new Date(schedule.endTime)),
              notificationTime: formatDateForInput(new Date(schedule.notificationTime)),
              affectedAreas: schedule.affectedAreas,
              maintenanceMessage: schedule.maintenanceMessage,
            });
          }
        } catch (error) {
          toast.error("Error fetching maintenance schedule", {
            description: (error as Error).message,
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [status, router, form]);

  const onSubmit = async (data: MaintenanceFormValues) => {
    try {
      const result = await upsertMaintenanceSchedule({
        isActive: data.isActive,
        startTime: parseLocalDateTime(data.startTime),
        endTime: parseLocalDateTime(data.endTime),
        notificationTime: parseLocalDateTime(data.notificationTime),
        affectedAreas: data.affectedAreas,
        maintenanceMessage: data.maintenanceMessage,
      });

      if (result.success) {
        toast.success("Maintenance schedule updated", {
          description: data.isActive
            ? "The maintenance mode has been activated"
            : "Maintenance settings have been saved but are not active",
        });
      } else {
        toast.error("Error updating maintenance schedule", {
          description: result.message,
        });
      }
    } catch (error) {
      toast.error("Error updating maintenance schedule", {
        description: (error as Error).message,
      });
    }
  };

  if (status === "loading" || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Maintenance Mode</h1>

      <Card className="mb-4">
        <CardHeader className="bg-amber-50 dark:bg-amber-950/50">
          <CardTitle>Maintenance Mode Configuration</CardTitle>
          <CardDescription>
            When activated, only administrators will be able to access the site during the
            maintenance period. Users will see a maintenance page with the message you specify.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Activate Maintenance Mode</FormLabel>
                      <FormDescription>
                        When enabled, the site will be inaccessible to non-admin users during the
                        scheduled maintenance period.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>When maintenance mode will begin</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>When maintenance mode will end</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notificationTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        When to start showing maintenance notification banners
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="affectedAreas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affected Areas</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={form.formState.isSubmitting} />
                      </FormControl>
                      <FormDescription>
                        Brief description of what features will be affected
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="maintenanceMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        disabled={form.formState.isSubmitting}
                        placeholder="Enter the message that will be displayed to users during maintenance"
                      />
                    </FormControl>
                    <FormDescription>
                      This message will be displayed on the maintenance page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full md:w-auto"
              >
                {form.formState.isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="bg-muted/20 flex flex-col items-start">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Only administrators will be able to access the site during
            maintenance.
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Here&apos;s how the maintenance page will look to users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-4 flex flex-col items-center justify-center min-h-[300px] bg-background">
            <div className="w-full max-w-md">
              <div className="text-center space-y-2">
                <div className="bg-primary/10 p-4 rounded-full inline-block mx-auto mb-4">
                  <svg
                    className="h-12 w-12 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">System Maintenance</h2>
                <p className="text-muted-foreground">{form.watch("maintenanceMessage")}</p>
                <div className="mt-6 text-sm">
                  <p className="text-muted-foreground">
                    From:{" "}
                    {parseLocalDateTime(form.watch("startTime")).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="text-muted-foreground">
                    To:{" "}
                    {parseLocalDateTime(form.watch("endTime")).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
