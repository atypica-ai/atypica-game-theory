import { checkPersonaAccess } from "@/app/(persona)/actions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PersonaChatPage } from "./PersonaChatPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { id } = await params;
  const personaId = parseInt(id);

  if (isNaN(personaId)) {
    return {};
  }

  const result = await checkPersonaAccess(personaId);
  if (!result.success) {
    return {};
  }

  const persona = result.data;

  return generatePageMetadata({
    title: `Chat with ${persona.name}`,
    description: `Have a conversation with ${persona.name} - ${persona.source}`,
    locale,
  });
}

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const personaId = parseInt(id);

  if (isNaN(personaId)) {
    notFound();
  }

  const result = await checkPersonaAccess(personaId);
  if (!result.success) {
    if (result.code === "not_found") {
      notFound();
    }
    // For unauthorized or forbidden, we could redirect to login or show access denied
    // For now, let's just show not found to avoid exposing persona existence
    notFound();
  }

  const persona = result.data;

  return <PersonaChatPage persona={persona} />;
}
