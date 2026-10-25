"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

const schema = z.object({
  name: z.string().min(2, "Enter your company name").max(100),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").regex(/[A-Z]/, "Include an uppercase letter").regex(/[a-z]/, "Include a lowercase letter").regex(/[0-9]/, "Include a number"),
  contactNumber: z.string(),
  businessAddress: z.string().max(500),
});
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [logo, setLogo] = useState<File | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "", contactNumber: "", businessAddress: "" } });

  async function onSubmit(values: Values) {
    try {
      const payload = new FormData();
      for (const [key, value] of Object.entries(values)) payload.set(key, value);
      if (logo) payload.set("logo", logo);
      const response = await fetch("/api/auth/register", { method: "POST", body: payload });
      const result: { message?: string; error?: { details?: Array<{ message: string }> } } = await response.json();
      if (!response.ok) {
        toast.error(result.error?.details?.[0]?.message ?? result.message ?? "Registration failed");
        return;
      }
      toast.success(result.message ?? "Registration submitted for review");
      router.push("/login");
    } catch {
      toast.error("Registration failed. Please try again.");
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Register your company</CardTitle><CardDescription>Create a {appConfig.name} account. We will review your application.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name}><FieldLabel htmlFor="name">Company name</FieldLabel><Input id="name" autoComplete="organization" {...form.register("name")} /><FieldError errors={[form.formState.errors.name]} /></Field>
              <Field data-invalid={!!form.formState.errors.email}><FieldLabel htmlFor="email">Company email</FieldLabel><Input id="email" type="email" autoComplete="email" {...form.register("email")} /><FieldError errors={[form.formState.errors.email]} /></Field>
              <Field data-invalid={!!form.formState.errors.password}><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" type="password" autoComplete="new-password" {...form.register("password")} /><FieldError errors={[form.formState.errors.password]} /><FieldDescription>Use 8 or more characters with upper and lowercase letters and a number.</FieldDescription></Field>
              <Field data-invalid={!!form.formState.errors.contactNumber}><FieldLabel htmlFor="contactNumber">Contact number</FieldLabel><Input id="contactNumber" type="tel" {...form.register("contactNumber")} /><FieldError errors={[form.formState.errors.contactNumber]} /></Field>
              <Field data-invalid={!!form.formState.errors.businessAddress}><FieldLabel htmlFor="businessAddress">Business address</FieldLabel><Input id="businessAddress" {...form.register("businessAddress")} /><FieldError errors={[form.formState.errors.businessAddress]} /></Field>
              <Field><FieldLabel htmlFor="logo">Company logo (optional)</FieldLabel><Input id="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} /><FieldDescription>PNG, JPEG, WebP or GIF, up to 5 MB.</FieldDescription></Field>
              <Field><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Submitting…" : "Register company"}</Button><FieldDescription className="text-center">Already have an account? <Link href="/login">Sign in</Link></FieldDescription></Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
