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
import { Textarea } from "@/components/ui/textarea";
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
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a project category"),
  objectives: z.array(z.string()).min(1, "Please add at least one objective"),
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
  const [objectiveInput, setObjectiveInput] = useState("");

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      objectives: [],
    },
  });

  const objectives = form.watch("objectives");

  const addObjective = () => {
    if (objectiveInput.trim().length > 0) {
      form.setValue("objectives", [...objectives, objectiveInput.trim()]);
      setObjectiveInput("");
    }
  };

  const removeObjective = (index: number) => {
    form.setValue(
      "objectives",
      objectives.filter((_, i) => i !== index),
    );
  };

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
              Set up a new interview project to gather information and insights.
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the purpose of this interview project..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
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

                <div className="pt-4 border-t">
                  <h2 className="text-xl font-semibold mb-4">Research Objectives</h2>
                  <FormField
                    control={form.control}
                    name="objectives"
                    render={() => (
                      <FormItem>
                        <FormDescription className="mb-2">
                          Define what you aim to learn from these interviews. Each objective should
                          be a specific question or goal.
                        </FormDescription>

                        <div className="flex space-x-2 mt-2">
                          <Input
                            placeholder="E.g., Understand user pain points with current solutions"
                            value={objectiveInput}
                            onChange={(e) => setObjectiveInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addObjective();
                              }
                            }}
                          />
                          <Button type="button" onClick={addObjective}>
                            Add
                          </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {objectives.length === 0 ? (
                            <div className="text-muted-foreground italic py-2">
                              No objectives added yet. Add at least one to continue.
                            </div>
                          ) : (
                            objectives.map((objective, index) => (
                              <div
                                key={index}
                                className="flex justify-between items-center p-3 bg-muted rounded-md"
                              >
                                <span className="mr-2">{objective}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeObjective(index)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Interview Project"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
