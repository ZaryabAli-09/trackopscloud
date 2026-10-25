import "server-only";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { Company } from "@/models/Company";
import type { Role } from "@/types";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  companyName: string | null;
  companyLogo: string | null;
}

export async function getValidatedViewer(): Promise<Viewer | null> {
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) return null;

  await connectToDatabase();
  const user = await User.findById(session.user.id);
  if (!user || !user.isActive || user.sessionVersion !== session.user.sessionVersion) return null;
  if (user.role !== session.user.role) return null;

  let companyName: string | null = null;
  let companyLogo: string | null = null;
  if (user.role !== "platform_admin") {
    if (!user.companyId) return null;
    const company = await Company.findById(user.companyId);
    if (!company || company.status !== "approved") return null;
    companyName = company.name;
    companyLogo = company.logo?.url ?? company.logoUrl ?? null;
  }

  return {
    id: user._id.toString(),
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role,
    companyId: user.companyId?.toString() ?? null,
    companyName,
    companyLogo,
  };
}
