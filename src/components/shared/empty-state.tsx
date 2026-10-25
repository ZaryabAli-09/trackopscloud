import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <Empty className="border"><EmptyHeader><EmptyTitle>{title}</EmptyTitle>{description && <EmptyDescription>{description}</EmptyDescription>}</EmptyHeader>{action && <EmptyContent>{action}</EmptyContent>}</Empty>;
}
