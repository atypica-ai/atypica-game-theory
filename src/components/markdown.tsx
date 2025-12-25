/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { convertUrlsToMarkdownLinks } from "@/lib/textUtils";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  // 预处理：将纯文本 URL 转换为 Markdown 自动链接格式
  const processedText = convertUrlsToMarkdownLinks(children);

  const components = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <pre
          {...props}
          className={`${className} w-[80dvw] md:max-w-[500px] overflow-x-scroll bg-zinc-100 p-2 rounded mt-2 dark:bg-zinc-800`}
        >
          <code className={match[1]}>{children}</code>
        </pre>
      ) : (
        <pre
          {...props}
          className={`${className} bg-zinc-100 dark:bg-zinc-800 rounded whitespace-pre-wrap inline-block mx-1 px-1`}
        >
          <code>{children}</code>
        </pre>
      );
    },
    ol: ({ node, children, ...props }: any) => {
      return (
        <ol className="list-decimal ml-7 mb-2" {...props}>
          {children}
        </ol>
      );
    },
    ul: ({ node, children, ...props }: any) => {
      return (
        <ul className="list-disc ml-4 mb-2" {...props}>
          {children}
        </ul>
      );
    },
    li: ({ node, children, ...props }: any) => {
      return (
        <li className="mb-1" {...props}>
          {children}
        </li>
      );
    },
    strong: ({ node, children, ...props }: any) => {
      return (
        <span className="font-semibold" {...props}>
          {children}
        </span>
      );
    },
    p: ({ node, children, ...props }: any) => {
      // 很多元素不能放在 p 下面，markdown 的格式不可控，这里索性用 div
      return (
        <div className="whitespace-pre-wrap mb-2" {...props}>
          {children}
        </div>
      );
    },
    h1: ({ node, children, ...props }: any) => {
      return (
        <h1 className="text-[1.25em] mt-3 mb-2 font-bold" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }: any) => {
      return (
        <h2 className="text-[1.2em] mt-3 mb-2 font-bold" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }: any) => {
      return (
        <h3 className="text-[1.1em] mt-3 mb-2 font-bold" {...props}>
          {children}
        </h3>
      );
    },
    a: ({ node, href, children, ...props }: any) => {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-words"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {processedText}
    </ReactMarkdown>
  );
};

export const Markdown = React.memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
