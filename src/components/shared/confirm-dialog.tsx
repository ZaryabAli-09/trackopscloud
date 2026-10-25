"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ trigger, title, description, confirmLabel = "Confirm", onConfirm }: { trigger: React.ReactNode; title: string; description: string; confirmLabel?: string; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger render={<Button variant="outline" size="sm" />}>{trigger}</AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={async (event) => { event.preventDefault(); setPending(true); try { await onConfirm(); setOpen(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Action failed"); } finally { setPending(false); } }}>{pending ? "Working…" : confirmLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
