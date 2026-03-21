import { Role } from "@/lib/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    department?: string | null;
    permissions?: string[];
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      department?: string | null;
      permissions: string[];
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    department?: string | null;
    permissions: string[];
  }
}