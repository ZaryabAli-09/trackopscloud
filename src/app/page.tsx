import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth/config";

export default async function Home() {
  const session = await getServerSession(authConfig);
  if (!session?.user) redirect("/login");
  redirect(session.user.role === "platform_admin" ? "/platform-admin" : "/dashboard");
}
