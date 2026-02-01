"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
// import { zodResolver } from "@hookform/resolvers/zod";
// see https://github.com/react-hook-form/resolvers/issues/768
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { changePassword, getCurrentUser, updateName } from "./actions";

const nameFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

const passwordFormSchema = z
  .object({
    newPassword: z.string().min(8, {
      message: "New password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function ProfilePage() {
  const t = useTranslations("AccountPage.profile");
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [isAwsUser, setIsAwsUser] = useState(false);

  const nameForm = useForm<z.infer<typeof nameFormSchema>>({
    resolver: standardSchemaResolver(nameFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const passwordForm = useForm({
    resolver: standardSchemaResolver(passwordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      const result = await getCurrentUser();
      if (result.success) {
        nameForm.reset({ name: result.data.name || "" });
        setUserEmail(result.data.email || "");
        setIsAwsUser(result.data.isAwsUser || false);
      } else {
        toast.error("Failed to load user data", { description: result.message });
      }
      setIsLoading(false);
    }
    loadUser();
  }, [nameForm]);

  async function onNameSubmit(values: z.infer<typeof nameFormSchema>) {
    const result = await updateName(values);
    if (result.success) {
      toast.success(t("nameUpdateSuccess"));
    } else {
      toast.error(t("nameUpdateError"), { description: result.message });
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    const result = await changePassword(values);
    if (result.success) {
      toast.success(t("passwordUpdateSuccess"));
      passwordForm.reset();
    } else {
      toast.error(t("passwordUpdateError"), { description: result.message });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 max-w-lg">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full max-w-sm" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
          <CardDescription>查看和更新您的账户信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Email Section */}
          {userEmail && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">{t("emailCard.emailLabel")}</h3>
              <Input
                value={userEmail}
                disabled
                className="bg-gray-50 text-gray-600 cursor-not-allowed max-w-sm"
                readOnly
              />
              <p className="text-xs text-muted-foreground">{t("emailCard.description")}</p>
            </div>
          )}

          {/* AWS User Notice */}
          {isAwsUser && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-900">
                {t("awsUserNotice")}
              </p>
            </div>
          )}

          {/* Name Section */}
          {!isAwsUser && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">{t("nameCard.nameLabel")}</h3>
              <Form {...nameForm}>
                <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="space-y-4">
                  <FormField
                    control={nameForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder={t("nameCard.namePlaceholder")}
                            {...field}
                            className="max-w-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={nameForm.formState.isSubmitting} size="sm">
                    {nameForm.formState.isSubmitting ? t("saving") : t("saveChanges")}
                  </Button>
                </form>
              </Form>
              <p className="text-xs text-muted-foreground">{t("nameCard.description")}</p>
            </div>
          )}

          {/* Divider */}
          {!isAwsUser && <div className="border-t"></div>}

          {/* Password Section */}
          {!isAwsUser && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">{t("passwordCard.title")}</h3>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("passwordCard.newPasswordLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="password" {...field} className="max-w-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t("passwordCard.confirmPasswordLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="password" {...field} className="max-w-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting} size="sm">
                    {passwordForm.formState.isSubmitting ? t("saving") : t("updatePassword")}
                  </Button>
                </form>
              </Form>
              <p className="text-xs text-muted-foreground">{t("passwordCard.description")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
