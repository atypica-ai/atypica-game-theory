"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { ExtractServerActionData } from "@/lib/serverAction";
import { MessageCircle, User as UserIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PaginationInfo } from "../utils";
import { fetchEnterpriseLeads } from "./actions";

type EnterpriseLead = ExtractServerActionData<typeof fetchEnterpriseLeads>[number];
type Message = { id: string; role: "user" | "assistant" | "system"; content: string };

export default function EnterpriseLeadsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<EnterpriseLead[]>([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // Initialize page from URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      if (pageParam) {
        setCurrentPage(parseInt(pageParam, 10));
      }
    }
  }, []);

  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPage.toString());
    window.history.pushState({}, "", url.toString());
  }, [currentPage]);

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

  // Format the date to a readable format
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderAllUserMessages = (messages: Message[]) => {
    const userMessages = messages.filter((msg) => msg.role === "user");
    return (
      <div className="space-y-2 mt-2">
        {userMessages.map((message, index) => (
          <div key={`user-${index}`} className="flex items-start gap-2 text-sm">
            <div className="h-5 w-5 mt-0.5 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon size={12} />
            </div>
            <p className="text-gray-700">{message.content}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderFullConversation = (messages: Message[]) => {
    return (
      <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-3 mt-2 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex items-start gap-2 ${message.role === "system" ? "opacity-75" : ""}`}
          >
            {message.role === "assistant" ? (
              <div className="h-5 w-5 mt-0.5 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle size={12} className="text-blue-600" />
              </div>
            ) : message.role === "user" ? (
              <div className="h-5 w-5 mt-0.5 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                <UserIcon size={12} />
              </div>
            ) : (
              <div className="h-5 w-5 mt-0.5 flex-shrink-0 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-[10px] text-yellow-800">SYS</span>
              </div>
            )}
            <p
              className={`text-sm ${message.role === "assistant" ? "text-blue-800" : message.role === "user" ? "text-gray-900" : "text-yellow-800 italic"}`}
            >
              {message.content}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const extractContactInfo = (messages: Message[]) => {
    // Extract email and phone
    const userMessages = messages.filter((msg) => msg.role === "user").map((msg) => msg.content);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:(?:\+|00)86)?1[3-9]\d{9}/g;
    const wechatRegex = /(?:微信|WeChat|wechat)[:：]?\s*([a-zA-Z0-9_-]{5,})/gi;
    // Collect all matches
    const emails: string[] = [];
    const phones: string[] = [];
    const wechatIds: string[] = [];
    userMessages.forEach((msg) => {
      const foundEmails = msg.match(emailRegex);
      if (foundEmails) emails.push(...foundEmails);
      const foundPhones = msg.match(phoneRegex);
      if (foundPhones) phones.push(...foundPhones);
      const wechatMatches = [...msg.matchAll(wechatRegex)];
      wechatMatches.forEach((match) => {
        if (match[1]) wechatIds.push(match[1]);
      });
    });
    return {
      emails: [...new Set(emails)],
      phones: [...new Set(phones)],
      wechatIds: [...new Set(wechatIds)],
    };
  };

  if (status === "loading" || isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">企业版咨询记录</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">{error}</div>}

      <div className="space-y-4">
        {leads.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-lg">暂无企业用户咨询记录</p>
          </div>
        ) : (
          leads.map((lead) => {
            const messages = lead.messages as unknown as Message[];
            const contactInfo = extractContactInfo(messages);
            return (
              <Card key={lead.id} className="overflow-hidden py-0 gap-1">
                <CardHeader className="py-3 px-3 md:px-4 bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="overflow-hidden">
                    <span className="font-medium text-gray-700 block sm:inline text-sm sm:text-base truncate">{lead.user.email}</span>
                    <span className="text-xs text-gray-500 sm:ml-2 block sm:inline">{formatDate(lead.createdAt)}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link href={`/study/${lead.token}/share?replay=1`} target="_blank">
                      查看完整对话
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-3 md:p-4">
                  {/* Contact Information */}
                  {(contactInfo.emails.length > 0 ||
                    contactInfo.phones.length > 0 ||
                    contactInfo.wechatIds.length > 0) && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-100">
                      <h3 className="text-sm font-medium text-blue-800">联系方式:</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                        {contactInfo.emails.map((email) => (
                          <span key={email} className="text-blue-700 break-all">
                            📧 {email}
                          </span>
                        ))}
                        {contactInfo.phones.map((phone) => (
                          <span key={phone} className="text-blue-700">
                            📱 {phone}
                          </span>
                        ))}
                        {contactInfo.wechatIds.map((id) => (
                          <span key={id} className="text-blue-700">
                            💬 {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* User messages */}
                  {renderAllUserMessages(messages)}
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
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
