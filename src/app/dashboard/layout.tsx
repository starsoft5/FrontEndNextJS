"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed.role === "Admin") {
          setStatus("authorized");
        } else if (parsed.role === "User") {
          if (pathname.startsWith("/dashboard/orders")) {
            setStatus("authorized");
          } else {
            router.replace("/dashboard/orders");
          }
        } else {
          setStatus("unauthorized");
        }
      } catch {
        setStatus("unauthorized");
      }
    } else {
      setStatus("unauthorized");
    }
  }, [router, pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card-bg rounded-xl shadow-lg border border-border p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-red-100">
            <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-danger mb-2">Unauthorized User</h1>
          <p className="text-muted mb-6">
            You do not have Admin privileges to access this page. Please contact your administrator.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("user");
              router.replace("/login");
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
