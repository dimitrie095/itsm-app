import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import UserSettingsClient from "./user-settings-client";

export default async function UserSettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return (
    <UserSettingsClient
      initialName={session.user.name || ""}
      initialEmail={session.user.email || ""}
      initialDepartment={session.user.department || ""}
    />
  );
}