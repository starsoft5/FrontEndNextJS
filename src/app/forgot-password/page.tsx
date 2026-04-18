"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email is required.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(trimmed);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      if (e.response) {
        setError(e.response.data?.message || "Unable to process request. Please try again.");
      } else {
        setError(`Cannot connect to server: ${e.message || "Network error"}.`);
      }
      console.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card-bg rounded-xl shadow-lg border border-border p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Forgot Password</h1>
        <p className="text-sm text-muted text-center mb-6">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {success ? (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            If an account exists for <span className="font-medium">{email}</span>, a password reset
            link has been sent. Check your inbox.
          </div>
        ) : (
          <>
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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${emailError ? "border-red-500" : "border-border"}`}
                  placeholder="you@example.com"
                />
                {emailError && <p className="mt-1 text-sm text-danger">{emailError}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
