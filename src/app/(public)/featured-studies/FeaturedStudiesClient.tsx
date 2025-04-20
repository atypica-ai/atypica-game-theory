"use client";
import { fetchPublicFeaturedStudies } from "@/app/admin/featured-studies/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FeaturedStudyCategory } from "./data";

type TStudies = ExtractServerActionData<typeof fetchPublicFeaturedStudies>;

export default function FeaturedStudiesClient() {
  const t = useTranslations("FeaturedStudiesPage");
  const [studies, setStudies] = useState<TStudies>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    async function loadStudies() {
      setIsLoading(true);
      try {
        const result = await fetchPublicFeaturedStudies({
          category: activeCategory === "all" ? undefined : activeCategory,
        });
        if (result.success) {
          setStudies(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadStudies();
  }, [activeCategory]);

  // Filter studies by category
  const filteredStudies =
    activeCategory === "all"
      ? studies
      : studies.filter((study) => study.category === activeCategory);

  const categories: ("all" | FeaturedStudyCategory)[] = [
    "all",
    FeaturedStudyCategory.TESTING,
    FeaturedStudyCategory.PLANNING,
    FeaturedStudyCategory.INSIGHTS,
    FeaturedStudyCategory.COCREATION,
  ];

  const getCategoryLabel = (category: "all" | FeaturedStudyCategory | null) => {
    if (!category) return "";
    switch (category) {
      case "all":
        return t("categories.all");
      case FeaturedStudyCategory.TESTING:
        return t("categories.testing");
      case FeaturedStudyCategory.PLANNING:
        return t("categories.planning");
      case FeaturedStudyCategory.INSIGHTS:
        return t("categories.insights");
      case FeaturedStudyCategory.COCREATION:
        return t("categories.cocreation");
      default:
        return category;
    }
  };

  const renderStudyGrid = (studies: TStudies) => {
    if (studies.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t("noStudies")}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {studies.map((study) => (
          <Card key={study.id} className="flex flex-col h-full">
            <CardHeader className="flex items-center">
              <HippyGhostAvatar seed={study.id} className="size-6" />
              <CardTitle className="text-sm font-normal truncate">{study.analyst.role}</CardTitle>
              <div className="ml-auto text-xs md:text-sm text-muted-foreground">
                {getCategoryLabel(study.category)}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="font-medium mb-2 line-clamp-1">{study.analyst.topic}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {study.analyst.studySummary}
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full text-xs md:text-sm">
                <Link href={`/study/${study.studyUserChat.token}/share?replay=1`} target="_blank">
                  {t("viewStudy")}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("flex-1 overflow-y-auto scrollbar-thin", "py-4 md:py-6 px-4 md:px-6")}>
      <div className=" flex flex-col items-center gap-4 md:gap-6 max-w-screen-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-center">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-center text-sm md:text-base max-w-lg">
          {t("description")}
        </p>

        {/* Desktop view: Tabs */}
        <Tabs
          defaultValue="all"
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="mt-6 items-center hidden md:flex w-full"
        >
          <TabsList className="mb-6">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {getCategoryLabel(category)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeCategory}>
            {isLoading ? (
              <div className="flex justify-center">
                <Loader2Icon className="size-8 animate-spin" />
              </div>
            ) : (
              renderStudyGrid(filteredStudies)
            )}
          </TabsContent>
        </Tabs>

        {/* Mobile view: Dropdown select */}
        <div className="md:hidden w-full max-w-xs mt-6">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          >
            {categories.map((category) => (
              <option key={category} value={category} className="capitalize">
                {getCategoryLabel(category)}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile view: Content area */}
        <div className="md:hidden w-full mt-4">
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2Icon className="size-8 animate-spin" />
            </div>
          ) : (
            renderStudyGrid(filteredStudies)
          )}
        </div>
      </div>
    </div>
  );
}
