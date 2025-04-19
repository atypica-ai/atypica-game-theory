import { Metadata } from "next";
import FeaturedStudiesClient from "./FeaturedStudiesClient";

export const metadata: Metadata = {
  title: "Featured Studies | atypica.AI",
  description: "Browse our collection of featured market analysis studies",
};

export default async function FeaturedStudiesPage() {
  return <FeaturedStudiesClient />;
}
