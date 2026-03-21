import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { getUserPermissionNames } from "./access";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import OktaProvider from "next-auth/providers/okta";
import bcryptjs from "bcryptjs";
import { Role } from "@/lib/generated/prisma/enums";

// Extend the built-in session types
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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "john@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        let user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        // If user doesn't exist and we're using demo password, create a demo user
        if (!user && credentials.password === "demo123") {
          // Check if this is a known demo email
          const demoUsers = [
            { email: "admin@example.com", name: "Admin User", role: "ADMIN", department: "IT" },
            { email: "agent@example.com", name: "Support Agent", role: "AGENT", department: "Support" },
            { email: "user@example.com", name: "End User", role: "END_USER", department: "Sales" },
          ];
          
          const demoUser = demoUsers.find(u => u.email === credentials.email);
          if (demoUser) {
            user = await prisma.user.create({
              data: {
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role as Role,
                department: demoUser.department,
                passwordHash: await bcryptjs.hash("demo123", 10),
                emailVerified: new Date(),
              },
            });
          }
        }

        if (!user) {
          throw new Error("User not found");
        }

        // Check password
        let isValid = false;
        if (user.passwordHash) {
          // Compare hashed password
          isValid = await bcryptjs.compare(credentials.password, user.passwordHash);
        } else {
          // Fallback for demo (temporary)
          isValid = credentials.password === "demo123";
        }
        
        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        };
      }
    }),
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
      ? [AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
          tenantId: process.env.AZURE_AD_TENANT_ID,
        })]
      : []),
    ...(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER
      ? [OktaProvider({
          clientId: process.env.OKTA_CLIENT_ID,
          clientSecret: process.env.OKTA_CLIENT_SECRET,
          issuer: process.env.OKTA_ISSUER,
        })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.department = user.department;
        // Fetch user permissions
        const permissions = await getUserPermissionNames(user.id);
        console.log(`[auth] User ${user.id} permissions:`, permissions);
        token.permissions = permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.department = token.department;
        session.user.permissions = token.permissions || [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};