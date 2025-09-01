// Mock server-only module to avoid client component error
import { Module } from "module";
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {}; // Mock empty object
  }
  return originalRequire.apply(this, arguments as any);
};
