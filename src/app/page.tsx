import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-8 px-4">
        <h1 className="text-4xl font-bold text-foreground">
          Management System
        </h1>
        <p className="text-muted text-lg">
          Please sign in to continue
        </p>
        <div className="flex gap-4 justify-center flex-col sm:flex-row">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-center"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors text-center"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
