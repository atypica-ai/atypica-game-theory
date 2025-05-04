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
import { ArrowLeft, Briefcase, Lightbulb, School, Search, Target, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createInterviewProject } from "../actions";

const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(1, "Please select a project category"),
});

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
        toast.success("Project created successfully!");
        router.push(`/interviewProject/${result.data.token}`);
      } else {
        toast.error(`Failed to create project: ${result.message}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalHeader>
        <Button variant="ghost" asChild>
          <Link href="/interviewProject">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
      </GlobalHeader>

      <main className="flex-1 container max-w-3xl mx-auto py-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Create Interview Project</h1>
            <p className="text-muted-foreground mt-2">
              Start your research project by giving it a name and selecting a category. You'll refine the details later.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Project Details</h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Title</FormLabel>
                          <FormControl>
                            <Input placeholder="E.g., Market Research for New Product" {...field} />
                          </FormControl>
                          <FormDescription>
                            Give your project a clear, descriptive name.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project type" />
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
                                    <span className="ml-2">{category.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            This helps the interview expert tailor its approach.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Project & Start Clarifying"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  After creating your project, you'll be taken to a chat interface where you can define your research objectives and project brief.
                </p>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}