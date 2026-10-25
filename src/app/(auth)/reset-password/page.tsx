"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { appConfig } from "@/config/app.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const requestSchema = z.object({ email: z.email("Enter a valid email") });
const resetSchema = z.object({ password: z.string().min(8, "Use at least 8 characters").regex(/[A-Z]/, "Include an uppercase letter").regex(/[a-z]/, "Include a lowercase letter").regex(/[0-9]/, "Include a number") });

function ResetContent() {
  const token = useSearchParams().get("token");
  const [done, setDone] = useState(false);
  const requestForm = useForm<z.infer<typeof requestSchema>>({ resolver: zodResolver(requestSchema), defaultValues: { email: "" } });
  const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "" } });

  async function submitRequest(values: z.infer<typeof requestSchema>) {
    try {
      const response = await fetch("/api/auth/password-reset-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result: { message?: string } = await response.json();
      if (!response.ok) { toast.error(result.message ?? "Request failed"); return; }
      toast.success(result.message ?? "If the account exists, check your email for a reset link.");
      setDone(true);
    } catch { toast.error("Request failed. Please try again."); }
  }

  async function submitReset(values: z.infer<typeof resetSchema>) {
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...values }) });
      const result: { message?: string } = await response.json();
      if (!response.ok) { toast.error(result.message ?? "Password reset failed"); return; }
      toast.success(result.message ?? "Password reset successfully");
      setDone(true);
    } catch { toast.error("Password reset failed. Please try again."); }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>{token ? "Set a new password" : "Reset your password"}</CardTitle><CardDescription>{token ? `Enter a new password for your ${appConfig.name} account.` : "Enter your email and we will send a reset link if the account exists."}</CardDescription></CardHeader>
        <CardContent>
          {done ? <FieldDescription><Link href="/login">Return to sign in</Link></FieldDescription> : token ? (
            <form onSubmit={resetForm.handleSubmit(submitReset)} noValidate><FieldGroup>
              <Field data-invalid={!!resetForm.formState.errors.password}><FieldLabel htmlFor="password">New password</FieldLabel><Input id="password" type="password" autoComplete="new-password" {...resetForm.register("password")} /><FieldError errors={[resetForm.formState.errors.password]} /></Field>
              <Field><Button type="submit" disabled={resetForm.formState.isSubmitting}>{resetForm.formState.isSubmitting ? "Saving…" : "Reset password"}</Button></Field>
            </FieldGroup></form>
          ) : (
            <form onSubmit={requestForm.handleSubmit(submitRequest)} noValidate><FieldGroup>
              <Field data-invalid={!!requestForm.formState.errors.email}><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" autoComplete="email" {...requestForm.register("email")} /><FieldError errors={[requestForm.formState.errors.email]} /></Field>
              <Field><Button type="submit" disabled={requestForm.formState.isSubmitting}>{requestForm.formState.isSubmitting ? "Sending…" : "Send reset link"}</Button><FieldDescription className="text-center"><Link href="/login">Return to sign in</Link></FieldDescription></Field>
            </FieldGroup></form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetContent /></Suspense>;
}
