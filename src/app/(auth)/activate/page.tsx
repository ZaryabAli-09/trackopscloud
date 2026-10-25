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

const schema = z.object({ password: z.string().min(8, "Use at least 8 characters").regex(/[A-Z]/, "Include an uppercase letter").regex(/[a-z]/, "Include a lowercase letter").regex(/[0-9]/, "Include a number") });

function ActivateContent() {
  const token = useSearchParams().get("token");
  const [done, setDone] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: "" } });

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      const response = await fetch("/api/auth/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...values }) });
      const result: { message?: string } = await response.json();
      if (!response.ok) { toast.error(result.message ?? "Activation failed"); return; }
      toast.success(result.message ?? "Account activated");
      setDone(true);
    } catch { toast.error("Activation failed. Please try again."); }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Activate your account</CardTitle><CardDescription>Set a password to complete your {appConfig.name} account setup.</CardDescription></CardHeader>
        <CardContent>
          {done ? <FieldDescription><Link href="/login">Sign in</Link></FieldDescription> : !token ? <p role="alert" className="text-sm text-destructive">This activation link is missing its token.</p> : (
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate><FieldGroup>
              <Field data-invalid={!!form.formState.errors.password}><FieldLabel htmlFor="password">New password</FieldLabel><Input id="password" type="password" autoComplete="new-password" {...form.register("password")} /><FieldError errors={[form.formState.errors.password]} /></Field>
              <Field><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Activating…" : "Activate account"}</Button><FieldDescription className="text-center"><Link href="/login">Return to sign in</Link></FieldDescription></Field>
            </FieldGroup></form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ActivatePage() {
  return <Suspense fallback={null}><ActivateContent /></Suspense>;
}
