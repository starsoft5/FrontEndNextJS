"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const missingLink = !email || !token;

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!form.newPassword) errors.newPassword = "Password is required.";
    else if (form.newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(form.newPassword)) errors.newPassword = "Password must contain an uppercase letter.";
    else if (!/[a-z]/.test(form.newPassword)) errors.newPassword = "Password must contain a lowercase letter.";
    else if (!/[0-9]/.test(form.newPassword)) errors.newPassword = "Password must contain a number.";
    else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.newPassword))
      errors.newPassword = "Password must contain a special character.";

    if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (form.newPassword !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";

    return errors;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, newPassword: form.newPassword });
      router.push("/login?reset=success");
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { message?: string } }; message?: string };
      if (e.response) {
        setError(e.response.data?.message || "This reset link is invalid or has expired. Please request a new one.");
      } else {
        setError(`Cannot connect to server: ${e.message || "Network error"}.`);
      }
      console.error("Reset password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card-bg rounded-xl shadow-lg border border-border p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Set New Password</h1>
      <p className="text-sm text-muted text-center mb-6">
        {email ? (
          <>Resetting password for <span className="font-medium">{email}</span>.</>
        ) : (
          "Use the form below to choose a new password."
        )}
      </p>

      {missingLink && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">
          Invalid reset link. Please request a new one from the forgot-password page.
        </div>
      )}

      {error && !missingLink && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={form.newPassword}
            onChange={(e) => {
              setForm({ ...form, newPassword: e.target.value });
              setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.newPassword ? "border-red-500" : "border-border"}`}
            placeholder="Enter a new password"
            disabled={missingLink}
          />
          {fieldErrors.newPassword && (
            <p className="mt-1 text-sm text-danger">{fieldErrors.newPassword}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => {
              setForm({ ...form, confirmPassword: e.target.value });
              setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.confirmPassword ? "border-red-500" : "border-border"}`}
            placeholder="Re-enter the new password"
            disabled={missingLink}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-sm text-danger">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || missingLink}
          className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Resetting..." : "OK"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-primary hover:underline font-medium">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="text-muted">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
