// declare module "@/prisma/client" {
//   import { AnalystReport as AnalystReportPrisma } from "@/prisma/client/index";
//   export * from "@/prisma/client/index";

//   // 只覆盖这个不够，findUnique 返回的类型还是原来的
//   export type AnalystReport = Omit<AnalystReportPrisma, "extra"> & {
//     extra: {
//       coverObjectUrl?: string;
//       pdfObjectUrl?: string;
//     } | null;
//   };
// }
