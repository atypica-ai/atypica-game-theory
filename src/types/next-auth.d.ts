import "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    name: string;
    email: string;
  }
  interface Session {
    user?: {
      id: number;
      name: string;
      email: string;
    };
    expires: ISODateString;
  }
}
