"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { validateLogin, FieldErrors } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const errors = validateLogin(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await authApi.login(form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      router.push(res.data.user.role === "User" ? "/dashboard/orders" : "/dashboard/users");
    } catch (err: unknown) {
      const error = err as { response?: { status: number; data?: { message?: string } }; message?: string };
      if (error.response) {
        // Backend responded with an error status
        setError(error.response.data?.message || "Invalid email or password. Please try again.");
      } else {
        // Network error / CORS / backend not reachable
        setError(`Cannot connect to server: ${error.message || "Network error"}. Make sure the backend is running.`);
      }
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card-bg rounded-xl shadow-lg border border-border p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.email ? "border-red-500" : "border-border"}`}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setFieldErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.password ? "border-red-500" : "border-border"}`}
              placeholder="Enter your password"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
