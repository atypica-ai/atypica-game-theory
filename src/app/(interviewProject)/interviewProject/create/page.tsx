"use client";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Lightbulb, School, Search, Target, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createInterviewProject } from "../actions";
import { BackToProjectsButton } from "../components/BackButtons";

const projectCategories = [
  { id: "market_research", name: "Market Research", icon: <Search className="h-5 w-5" /> },
  {
    id: "product_development",
    name: "Product Development",
    icon: <Briefcase className="h-5 w-5" />,
  },
  { id: "academic_research", name: "Academic Research", icon: <School className="h-5 w-5" /> },
  { id: "user_research", name: "User Research", icon: <Users className="h-5 w-5" /> },
  { id: "competitor_analysis", name: "Competitor Analysis", icon: <Target className="h-5 w-5" /> },
  {
    id: "innovation_ideation",
    name: "Innovation & Ideation",
    icon: <Lightbulb className="h-5 w-5" />,
  },
];

export default function CreateInterviewProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("InterviewProject.create");

  const projectSchema = z.object({
    title: z.string().min(3, t("validation.titleMin")),
    category: z.string().min(1, t("validation.categoryRequired")),
  });

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      category: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof projectSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await createInterviewProject(data);
      if (result.success) {
        toast.success(t("toast.createSuccess"));
        router.push(`/interviewProject/${result.data.token}`);
      } else {
        toast.error(`${t("toast.createError")}: ${result.message}`);
      }
    } catch (error) {
      toast.error(t("toast.unexpectedError"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalHeader>
        <BackToProjectsButton />
      </GlobalHeader>

      <main className="flex-1 container max-w-3xl mx-auto py-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">{t("description")}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">{t("projectDetails")}</h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("projectTitle")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("titlePlaceholder")} {...field} />
                          </FormControl>
                          <FormDescription>{t("titleDescription")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("projectCategory")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("typeSelectPlaceholder")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projectCategories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                  className="flex items-center"
                                >
                                  <div className="flex items-center">
                                    {category.icon}
                                    <span className="ml-2">
                                      {(() => {
                                        switch (category.id) {
                                          case "market_research":
                                            return t("categories.market_research");
                                          case "product_development":
                                            return t("categories.product_development");
                                          case "academic_research":
                                            return t("categories.academic_research");
                                          case "user_research":
                                            return t("categories.user_research");
                                          case "competitor_analysis":
                                            return t("categories.competitor_analysis");
                                          case "innovation_ideation":
                                            return t("categories.innovation_ideation");
                                          default:
                                            return "-";
                                        }
                                      })()}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>{t("typeDescription")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? t("creating") : t("createButton")}
                </Button>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {t("afterCreateDescription")}
                </p>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
