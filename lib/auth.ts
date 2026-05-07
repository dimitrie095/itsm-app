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
    mustChangePassword?: boolean;
    permissions?: string[];
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      department?: string | null;
      mustChangePassword?: boolean;
      permissions: string[];
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    department?: string | null;
    mustChangePassword?: boolean;
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

        // Self-heal for environments where migration was not applied yet.
        // Prevents runtime failures like "column does not exist".
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`
          );
        } catch (_error) {
          // Ignore here; auth should continue and fail naturally only if truly required.
        }

        const isDevelopment = process.env.NODE_ENV === "development";
        const demoUsers = [
          { email: "admin@example.com", name: "Admin User", role: "ADMIN", department: "IT" },
          { email: "agent@example.com", name: "Support Agent", role: "AGENT", department: "Support" },
          { email: "user@example.com", name: "End User", role: "END_USER", department: "Sales" },
        ];
        const matchedDemoUser = demoUsers.find((u) => u.email === credentials.email);

        let user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        // In development, keep demo credentials always usable.
        if (isDevelopment && matchedDemoUser && credentials.password === "demo123") {
          const demoData = {
            email: matchedDemoUser.email,
            name: matchedDemoUser.name,
            role: matchedDemoUser.role as Role,
            department: matchedDemoUser.department,
            passwordHash: await bcryptjs.hash("demo123", 10),
            emailVerified: new Date(),
          };

          if (!user) {
            try {
              user = await prisma.user.create({
                data: { ...demoData, mustChangePassword: false } as any,
              });
            } catch (createError) {
              if (!String(createError).includes("Unknown argument `mustChangePassword`")) {
                throw createError;
              }
              user = await prisma.user.create({ data: demoData });
            }
          } else {
            try {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  passwordHash: demoData.passwordHash,
                  name: demoData.name,
                  department: demoData.department,
                  role: demoData.role,
                  mustChangePassword: false,
                } as any,
              });
            } catch (updateError) {
              if (!String(updateError).includes("Unknown argument `mustChangePassword`")) {
                throw updateError;
              }
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  passwordHash: demoData.passwordHash,
                  name: demoData.name,
                  department: demoData.department,
                  role: demoData.role,
                },
              });
            }
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
          mustChangePassword: (user as any).mustChangePassword,
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
        token.mustChangePassword = user.mustChangePassword;
        // Fetch user permissions
        const permissions = await getUserPermissionNames(user.id);
        console.log(`[auth] User ${user.id} permissions:`, permissions);
        token.permissions = permissions;
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
        });
        token.mustChangePassword = Boolean((dbUser as any)?.mustChangePassword);
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.department = token.department;
        session.user.mustChangePassword = token.mustChangePassword;
        session.user.permissions = token.permissions || [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};