import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ResetInitialPasswordForm from "./reset-initial-password-form";

export const dynamic = "force-dynamic";

export default async function ResetInitialPasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const mustChangePassword = Boolean((user as any)?.mustChangePassword);
  if (!mustChangePassword) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4">
      <ResetInitialPasswordForm userEmail={session.user.email || ""} />
    </div>
  );
}

