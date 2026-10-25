"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type FormField = { name: string; label: string; type?: "text" | "email" | "number" | "date" | "password" | "textarea"; placeholder?: string };

export function FormSheet({ open, onOpenChange, title, description, fields, defaults, schema, onSubmit, submitLabel = "Save" }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; fields: FormField[]; defaults: Record<string, string>; schema: z.ZodObject<Record<string, z.ZodString>>; onSubmit: (values: Record<string, string>) => Promise<void>; submitLabel?: string }) {
  const [pending, setPending] = useState(false);
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), values: defaults });
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{title}</SheetTitle>{description && <SheetDescription>{description}</SheetDescription>}</SheetHeader><form className="space-y-5 p-4" onSubmit={form.handleSubmit(async (values) => { setPending(true); try { await onSubmit(values); onOpenChange(false); toast.success(`${title} saved`); } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); } finally { setPending(false); } })}><FieldGroup>{fields.map((field) => { const error = form.formState.errors[field.name]; return <Field key={field.name} data-invalid={!!error}><FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>{field.type === "textarea" ? <Textarea id={field.name} aria-invalid={!!error} placeholder={field.placeholder} {...form.register(field.name)} /> : <Input id={field.name} type={field.type ?? "text"} aria-invalid={!!error} placeholder={field.placeholder} {...form.register(field.name)} />}{error && <FieldError>{error.message}</FieldError>}</Field>; })}</FieldGroup><SheetFooter className="p-0"><Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button></SheetFooter></form></SheetContent></Sheet>;
}
