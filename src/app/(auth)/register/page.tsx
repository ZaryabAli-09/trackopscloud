"use client";

export const dynamic = "force-dynamic";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const registerSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  contactNumber: z.string().optional(),
  businessAddress: z.string().max(500).optional(),
});

export default function RegisterPage() {
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", contactNumber: "", businessAddress: "" },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error?.details?.[0]?.message || data.message || "Registration failed");
      return;
    }

    alert(data.message || "Registration submitted successfully");
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-muted/50">
      <Card className="w-full w-lg">
        <CardHeader className="space-y-1">
          <CardTitle>Register Your Company</CardTitle>
          <CardDescription>Create your TrackOpsCloud account. Your application will be reviewed by our team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" placeholder="e.g. Glue Manufacturing Co." {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Company Email</Label>
              <Input id="email" type="email" placeholder="name@company.com" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number (optional)</Label>
              <Input id="contactNumber" placeholder="+1 (555) 000-0000" {...form.register("contactNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address (optional)</Label>
              <Input id="businessAddress" placeholder="123 Industrial Ave, Suite 100" {...form.register("businessAddress")} />
            </div>
            <p className="text-sm text-muted-foreground">
              Your account will be pending approval. You will receive an email once your application is reviewed.
            </p>
            <Button type="submit" className="w-full">Register Company</Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-center">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}