"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { appConfig } from "@/config/app.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: z.email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
type Values = z.infer<typeof schema>;

function loginMessage(error: string | undefined) {
  if (error?.includes("COMPANY_PENDING")) return "Your company application is pending approval.";
  if (error?.includes("COMPANY_REJECTED")) return "Your company application was rejected. Contact support for details.";
  if (error?.includes("COMPANY_SUSPENDED")) return "Your company account is suspended. Contact support for details.";
  if (error?.includes("ACCOUNT_DEACTIVATED")) return "Your account is deactivated. Contact your administrator.";
  return "Invalid email or password.";
}

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: Values) {
    setServerError("");
    try {
      const result = await signIn("credentials", { ...values, redirect: false });
      if (!result || result.error) {
        const message = loginMessage(result?.error ?? undefined);
        setServerError(message);
        toast.error(message);
        return;
      }
      toast.success("Signed in");
      router.replace("/");
      router.refresh();
    } catch {
      setServerError("Sign in failed. Please try again.");
      toast.error("Sign in failed. Please try again.");
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Sign in to {appConfig.name}</CardTitle><CardDescription>Enter your email and password to access your workspace.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
              <Field data-invalid={!!form.formState.errors.email}><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" autoComplete="email" {...form.register("email")} /><FieldError errors={[form.formState.errors.email]} /></Field>
              <Field data-invalid={!!form.formState.errors.password}><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" type="password" autoComplete="current-password" {...form.register("password")} /><FieldError errors={[form.formState.errors.password]} /></Field>
              <Field><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Signing in…" : "Sign in"}</Button><FieldDescription className="text-center">New here? <Link href="/register">Register your company</Link></FieldDescription><FieldDescription className="text-center"><Link href="/reset-password">Forgot your password?</Link></FieldDescription></Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
