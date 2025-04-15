/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
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
          className={`${className} bg-zinc-100 dark:bg-zinc-800 py-2.5 px-3 rounded whitespace-pre-wrap`}
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
      return (
        <p className="whitespace-pre-wrap mb-2" {...props}>
          {children}
        </p>
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
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = React.memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
