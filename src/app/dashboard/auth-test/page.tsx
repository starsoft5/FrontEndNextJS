"use client";

import { useState, useEffect, useCallback } from "react";
import api, { authApi } from "@/lib/api";

interface OidcConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  scopes_supported: string[];
  grant_types_supported: string[];
  response_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
}

interface JwtPayload {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  role?: string;
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  [key: string]: unknown;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString();
}

export default function AuthTestPage() {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [jwtPayload, setJwtPayload] = useState<JwtPayload | null>(null);
  const [oidcConfig, setOidcConfig] = useState<OidcConfig | null>(null);
  const [oidcError, setOidcError] = useState("");
  const [protectedResult, setProtectedResult] = useState<string | null>(null);
  const [protectedError, setProtectedError] = useState("");
  const [refreshResult, setRefreshResult] = useState("");
  const [loginTest, setLoginTest] = useState({ email: "", password: "" });
  const [loginResult, setLoginResult] = useState("");

  const loadTokens = useCallback(() => {
    const t = localStorage.getItem("token");
    const rt = localStorage.getItem("refreshToken");
    setToken(t);
    setRefreshToken(rt);
    if (t) {
      setJwtPayload(decodeJwt(t));
    } else {
      setJwtPayload(null);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // 1. Test OIDC Discovery
  const testOidc = async () => {
    setOidcError("");
    setOidcConfig(null);
    try {
      const res = await api.get("/../.well-known/openid-configuration");
      setOidcConfig(res.data);
    } catch {
      setOidcError("Failed to fetch OIDC configuration.");
    }
  };

  // 2. Test OAuth 2.0 Login (Password Grant)
  const testLogin = async () => {
    setLoginResult("");
    try {
      const res = await authApi.login(loginTest);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      loadTokens();
      setLoginResult("Login successful! Token issued.");
    } catch {
      setLoginResult("Login failed. Check credentials.");
    }
  };

  // 3. Test JWT Protected Endpoint
  const testProtected = async () => {
    setProtectedResult(null);
    setProtectedError("");
    try {
      const res = await api.get("/users");
      setProtectedResult(
        `Access granted. Retrieved ${res.data.length} user(s).`
      );
    } catch (err: unknown) {
      const error = err as { response?: { status: number } };
      if (error.response?.status === 401) {
        setProtectedError("401 Unauthorized - JWT token is missing or invalid.");
      } else {
        setProtectedError(`Request failed with status ${error.response?.status || "unknown"}.`);
      }
    }
  };

  // 4. Test without token
  const testWithoutToken = async () => {
    setProtectedResult(null);
    setProtectedError("");
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api") + "/users"
      );
      if (res.status === 401) {
        setProtectedError(
          "401 Unauthorized - Correctly rejected request without JWT."
        );
      } else {
        setProtectedResult(`Unexpected status: ${res.status}`);
      }
    } catch {
      setProtectedError("Network error.");
    }
  };

  // 5. Test Refresh Token
  const testRefresh = async () => {
    setRefreshResult("");
    if (!token || !refreshToken) {
      setRefreshResult("No tokens available. Login first.");
      return;
    }
    try {
      const res = await authApi.refresh(token, refreshToken);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      loadTokens();
      setRefreshResult("Token refreshed successfully! New token issued.");
    } catch {
      setRefreshResult("Refresh failed. Token may be expired or invalid.");
    }
  };

  const isExpired = jwtPayload
    ? jwtPayload.exp * 1000 < Date.now()
    : false;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">OAuth 2.0 / OIDC / JWT Test Page</h1>
      <p className="text-muted">
        Use this page to visually verify that authentication is working correctly.
      </p>

      {/* ===================== SECTION 1: OIDC Discovery ===================== */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">1. OIDC Discovery</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 font-medium">
            OpenID Connect
          </span>
        </div>
        <p className="text-sm text-muted mb-4">
          Fetches the <code className="bg-gray-100 px-1 rounded">/.well-known/openid-configuration</code> endpoint.
          This is the standard OIDC discovery document that clients use to find auth endpoints.
        </p>
        <button
          onClick={testOidc}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          Fetch OIDC Config
        </button>

        {oidcConfig && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted w-52">Issuer</td>
                  <td className="py-2 text-green-700 font-mono">{oidcConfig.issuer}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted">Token Endpoint</td>
                  <td className="py-2 font-mono text-sm">{oidcConfig.token_endpoint}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted">UserInfo Endpoint</td>
                  <td className="py-2 font-mono text-sm">{oidcConfig.userinfo_endpoint}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted">Scopes Supported</td>
                  <td className="py-2">
                    {oidcConfig.scopes_supported?.map((s) => (
                      <span key={s} className="inline-block mr-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted">Grant Types</td>
                  <td className="py-2">
                    {oidcConfig.grant_types_supported?.map((g) => (
                      <span key={g} className="inline-block mr-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        {g}
                      </span>
                    ))}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-muted">Signing Algorithm</td>
                  <td className="py-2 font-mono">{oidcConfig.id_token_signing_alg_values_supported?.join(", ")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {oidcError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">{oidcError}</div>
        )}
      </div>

      {/* ===================== SECTION 2: OAuth 2.0 Login ===================== */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">2. OAuth 2.0 Token Request</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
            OAuth 2.0
          </span>
        </div>
        <p className="text-sm text-muted mb-4">
          Test the <strong>Resource Owner Password</strong> grant type.
          Sends credentials to the token endpoint and receives a JWT access token + refresh token.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="email"
            placeholder="Email"
            value={loginTest.email}
            onChange={(e) => setLoginTest({ ...loginTest, email: e.target.value })}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginTest.password}
            onChange={(e) => setLoginTest({ ...loginTest, password: e.target.value })}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={testLogin}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Request Token
        </button>
        {loginResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            loginResult.includes("successful")
              ? "bg-green-50 border border-green-200 text-success"
              : "bg-red-50 border border-red-200 text-danger"
          }`}>
            {loginResult}
          </div>
        )}
      </div>

      {/* ===================== SECTION 3: JWT Token Inspection ===================== */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">3. JWT Token Inspection</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
            JWT
          </span>
        </div>

        {!token ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            No JWT token found in localStorage. Login first using Section 2.
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted mb-2">Raw Token (truncated)</h3>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs break-all max-h-20 overflow-hidden">
                {token}
              </div>
            </div>

            {jwtPayload && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted mb-3">Decoded Payload</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted w-44">Subject (sub)</td>
                      <td className="py-2 font-mono">{jwtPayload.sub}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted">Email</td>
                      <td className="py-2 font-mono">{jwtPayload.email}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted">Name</td>
                      <td className="py-2">{jwtPayload.given_name} {jwtPayload.family_name}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted">Issuer (iss)</td>
                      <td className="py-2 font-mono text-green-700">{jwtPayload.iss}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted">Audience (aud)</td>
                      <td className="py-2 font-mono">{jwtPayload.aud}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted">Issued At (iat)</td>
                      <td className="py-2">{formatTimestamp(jwtPayload.iat)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted">Expires (exp)</td>
                      <td className="py-2">
                        {formatTimestamp(jwtPayload.exp)}
                        {isExpired ? (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">EXPIRED</span>
                        ) : (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">VALID</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium text-muted">Token ID (jti)</td>
                      <td className="py-2 font-mono text-xs">{jwtPayload.jti}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted mb-2">Refresh Token</h3>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs break-all">
                {refreshToken || "None"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===================== SECTION 4: JWT Protected Endpoint ===================== */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">4. JWT Protected Endpoint</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
            JWT
          </span>
        </div>
        <p className="text-sm text-muted mb-4">
          Tests the <code className="bg-gray-100 px-1 rounded">/api/users</code> endpoint which requires a valid JWT Bearer token.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={testProtected}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Request WITH Token
          </button>
          <button
            onClick={testWithoutToken}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Request WITHOUT Token
          </button>
        </div>
        {protectedResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 text-success rounded-lg text-sm">
            {protectedResult}
          </div>
        )}
        {protectedError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-danger rounded-lg text-sm">
            {protectedError}
          </div>
        )}
      </div>

      {/* ===================== SECTION 5: Refresh Token Flow ===================== */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">5. OAuth 2.0 Token Refresh</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
            OAuth 2.0
          </span>
        </div>
        <p className="text-sm text-muted mb-4">
          Uses the refresh token to obtain a new access token without re-entering credentials.
          This is the OAuth 2.0 <strong>Refresh Token</strong> grant type.
        </p>
        <button
          onClick={testRefresh}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
        >
          Refresh Token
        </button>
        {refreshResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            refreshResult.includes("successfully")
              ? "bg-green-50 border border-green-200 text-success"
              : "bg-red-50 border border-red-200 text-danger"
          }`}>
            {refreshResult}
          </div>
        )}
      </div>
    </div>
  );
}
