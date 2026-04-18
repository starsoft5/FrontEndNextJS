"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { validateRegister, FieldErrors } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const errors = validateRegister(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const { confirmPassword: _, ...data } = form;
      void _;
      await authApi.register(data);
      router.push("/login");
    } catch {
      setError("Registration failed. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card-bg rounded-xl shadow-lg border border-border p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.firstName ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-sm text-danger">{fieldErrors.firstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.lastName ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-sm text-danger">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="new-email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.email ? "border-red-500" : "border-border"}`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.password ? "border-red-500" : "border-border"}`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.confirmPassword ? "border-red-500" : "border-border"}`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
