import { isSystemMessage } from "@/ai/messageUtilsClient";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

async function getChatData(userChatToken: string) {
  const result = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      kind: "sageSession",
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      sageChat: {
        select: {
          sage: {
            select: {
              name: true,
              domain: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!result?.sageChat) {
    notFound();
  }

  const { sageChat, ...userChat } = result;

  return { sageChat, userChat };
}

async function SageChatViewPage({ userChatToken }: { userChatToken: string }) {
  const locale = await getLocale();
  const { sageChat, userChat } = await getChatData(userChatToken);

  const { messages, title, createdAt } = userChat;
  const sageName = sageChat.sage.name;
  const userName = sageChat.user.name || sageChat.user.email || "User";

  // Filter out system messages
  const visibleMessages = messages.filter((msg) => msg.content && !isSystemMessage(msg.content));

  return (
    <FitToViewport className="px-8 py-8">
      {/* Document Header */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold text-foreground/90 mb-4">
          {title || `Chat with ${sageName}`}
        </h1>
        <div className="text-sm text-gray-600 space-y-1">
          <p>{formatDate(createdAt, locale)}</p>
          <p>
            {userName} ↔ {sageName}
          </p>
          {sageChat.sage.domain && (
            <p className="text-xs text-muted-foreground">{sageChat.sage.domain}</p>
          )}
        </div>
      </div>

      {/* Chat Content */}
      <section className="mb-12 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-foreground/90 mb-3 pb-1 border-b border-border">
          Conversation
        </h2>
        {visibleMessages.length > 0 ? (
          <div className="space-y-6">
            {visibleMessages.map((message, index) => (
              <div key={index} className="leading-relaxed text-sm">
                {message.role === "assistant" ? (
                  <div className="mb-2">
                    <strong className="font-bold">{sageName}:</strong>
                    <p className="mt-1 text-foreground/90 whitespace-pre-wrap">{message.content}</p>
                  </div>
                ) : (
                  <div className="text-foreground/80 mb-2">
                    <strong className="font-semibold">{userName}:</strong>
                    <p className="mt-1 text-foreground/70 whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No messages yet</p>
        )}
      </section>

      {/* Document Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Conversation transcript · {new Date().toLocaleDateString(locale)}
        </p>
      </div>
    </FitToViewport>
  );
}

export default async function SageChatViewPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageChatViewPage userChatToken={userChatToken} />
    </Suspense>
  );
}
