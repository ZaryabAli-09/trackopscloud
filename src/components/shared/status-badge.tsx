import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={status === "rejected" || status === "suspended" || status === "voided" ? "destructive" : status === "approved" || status === "paid" || status === "active" ? "default" : "secondary"}>{status.replaceAll("_", " ")}</Badge>;
}
