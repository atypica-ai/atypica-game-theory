"use client";
import { ToolName, TStudyMessageWithTool } from "@/ai/tools/types";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PaginationInfo } from "../types";
import { fetchEnterpriseLeads } from "./actions";

type EnterpriseLead = ExtractServerActionData<typeof fetchEnterpriseLeads>[number];

export const SearchParamsConfig = {
  page: createParamConfig.number(1),
} as const;

export type EnterpriseLeadsSearchParams = {
  page: number;
};

export function EnterpriseLeadsPageClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number>;
}) {
  const { status } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<EnterpriseLead[]>([]);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // Use search params hook for URL synchronization
  const {
    values: { page: currentPage },
    setParam,
  } = useListQueryParams<EnterpriseLeadsSearchParams>({
    params: SearchParamsConfig,
    initialValues: initialSearchParams,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchEnterpriseLeads(currentPage);
    if (!result.success) {
      setError(result.message);
    } else {
      setLeads(result.data);
      if (result.pagination) setPagination(result.pagination);
    }
    setIsLoading(false);
  }, [currentPage]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/enterprise-leads");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  const toggleExpandLead = (id: string) => {
    if (expandedLead === id) {
      setExpandedLead(null);
    } else {
      setExpandedLead(id);
    }
  };

  const renderFullConversation = (messages: TStudyMessageWithTool[]) => {
    return (
      <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-3 mt-2 bg-muted/30">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            nickname={message.role}
            message={message}
            renderToolUIPart={() => <></>}
          ></ChatMessage>
        ))}
      </div>
    );
  };

  const extractContactInfo = (messages: TStudyMessageWithTool[]) => {
    let contactInfo:
      | {
          name: string;
          company: string;
          title: string;
          contact: string;
        }
      | undefined;

    // Look for thanks tool information in message parts
    for (const message of messages) {
      if (message.parts) {
        for (const part of message.parts) {
          if (
            part.type === `tool-${ToolName.thanks}` &&
            "toolCallId" in part &&
            part.state === "input-available"
          ) {
            contactInfo = part.input;
          }
        }
      }
    }

    return contactInfo;
  };

  if (status === "loading" || isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">企业版咨询记录</h1>
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
      )}
      <div className="space-y-4">
        {leads.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-lg">暂无企业用户咨询记录</p>
          </div>
        ) : (
          leads.map((lead) => {
            const messages = lead.messages;
            const contactInfo = extractContactInfo(messages);
            return (
              <Card key={lead.id} className="overflow-hidden py-0 gap-1">
                <CardHeader className="py-3 px-3 md:px-4 bg-muted/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="overflow-hidden">
                    <span className="font-medium text-foreground block sm:inline text-sm sm:text-base truncate">
                      {lead.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground sm:ml-2 block sm:inline">
                      {formatDate(lead.createdAt, locale)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4">
                  {/* Contact Information */}
                  {contactInfo ? (
                    <div className="mb-3 p-2 bg-accent/20 rounded-md border">
                      <h3 className="text-sm font-medium text-accent-foreground">联系方式:</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                        {contactInfo.name && (
                          <span className="text-primary">👤 姓名: {contactInfo.name}</span>
                        )}
                        {contactInfo.company && (
                          <span className="text-primary break-all">
                            🏢 企业: {contactInfo.company}
                          </span>
                        )}
                        {contactInfo.title && (
                          <span className="text-primary">📋 职位: {contactInfo.title}</span>
                        )}
                        {contactInfo.contact && (
                          <span className="text-primary break-all">
                            📞 联系方式: {contactInfo.contact}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs mb-3 p-2 bg-accent/20 rounded-md border">
                      AI 没有总结出来联系信息，但展开完整对话可能可以找到更多信息
                    </div>
                  )}
                  {/* Toggle full conversation */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => toggleExpandLead(lead.id.toString())}
                  >
                    {expandedLead === lead.id.toString() ? "收起完整对话" : "展开完整对话"}
                  </Button>
                  {expandedLead === lead.id.toString() && renderFullConversation(messages)}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setParam("page", page)}
          />
          <div className="text-sm text-muted-foreground">
            Total: {pagination.totalCount.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
