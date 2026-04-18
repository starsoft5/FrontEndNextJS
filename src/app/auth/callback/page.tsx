"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) return;

    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");

    if (token) {
      localStorage.setItem("token", token);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      router.push("/dashboard/users");
    } else {
      router.push("/login");
    }
  }, [searchParams, router, error]);

  if (error) {
    return (
      <div className="w-full max-w-md bg-card-bg rounded-xl shadow-lg border border-border p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-danger">Authentication Failed</h1>
        <p className="text-muted mb-6">{error}</p>
        <a
          href="/login"
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors inline-block"
        >
          Back to Login
        </a>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-muted">Completing authentication...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted">Loading...</p>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
