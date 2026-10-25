"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token, password: "" },
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    setError(null);
    setMessage(null);

    const res = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: values.token, password: values.password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error?.details?.[0]?.message || data.message || "Password reset failed");
      return;
    }

    setMessage(data.message || "Password reset successfully");
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-muted/50">
      <Card className="w-full w-md">
        <CardHeader className="space-y-1">
          <CardTitle>{error ? "Reset Error" : "Reset Your Password"}</CardTitle>
          <CardDescription>Enter a new password for your TrackOpsCloud account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <p className="text-sm text-success">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!message && !error && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <input type="hidden" {...form.register("token")} />
              <Button type="submit" className="w-full" disabled={!token}>
                <Lock className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-center">
            Remember your password?{" "}
            <a href="/auth/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}