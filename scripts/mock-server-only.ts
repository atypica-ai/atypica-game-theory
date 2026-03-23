// Mock server-only module to avoid client component error
import { Module } from "module";
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {}; // Mock empty object
  }
  // Mock next/server to make `after()` a no-op in script context
  if (id === "next/server") {
    const actual = originalRequire.apply(this, arguments as any);
    return {
      ...actual,
      after: (fn: () => unknown) => {
        // Fire-and-forget: run async callbacks immediately without awaiting
        Promise.resolve().then(() => fn()).catch(() => {});
      },
    };
  }
  return originalRequire.apply(this, arguments as any);
};
