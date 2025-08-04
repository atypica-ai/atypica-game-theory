import "next-auth";

declare module "next-auth" {
  interface User {
    id: number;
    name: string;
    email: string;
    teamIdAsMember?: number;
  }
  interface Session {
    user?: {
      id: number;
      name: string;
      email: string;
      teamIdAsMember?: number;
    };
    expires: ISODateString;
  }
}
