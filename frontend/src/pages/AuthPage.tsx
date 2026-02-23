import { Navigate, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import Spinner from "../components/ui/Spinner";
import { consumePostLoginPath } from "../services/auth0";

function getCallbackError(search: string): string | null {
  const params = new URLSearchParams(search);
  const error = params.get("error");
  const description = params.get("error_description");
  const message = description || error;

  if (!message) {
    return null;
  }

  if (
    message.includes("is not authorized to access resource server") &&
    message.includes("Client")
  ) {
    return "Auth0 rejected this login request because the configured API audience is not allowed for this application. Check VITE_AUTH0_AUDIENCE and enable this API in your Auth0 application settings.";
  }

  return message;
}

function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path || path === "/login" || !path.startsWith("/")) {
    return "/";
  }
  return path;
}

export default function AuthPage() {
  usePageTitle("Welcome Back, Brainiac");
  const { isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const callbackError = useMemo(() => getCallbackError(location.search), [location.search]);
  const from =
    (location.state as { from?: { pathname?: string } } | undefined)?.from
      ?.pathname || "/";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isAuthenticated) {
    const target = sanitizeRedirectPath(
      from !== "/" ? from : consumePostLoginPath(),
    );
    return <Navigate to={target} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md surface-card p-8 shadow-sm rounded-3xl">
        <p className="meta-font text-xs uppercase tracking-[0.22em] text-[var(--primary)]">Welcome</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Learner Studio</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign in to continue.</p>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            setError(null);
            void login(from).catch(() => {
              setError("Unable to sign in. Please try again.");
            });
          }}
          className="mt-6 w-full rounded-lg border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-muted)] disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4" />
              Signing in...
            </span>
          ) : (
            "Sign in with Google"
          )}
        </button>

        {(error || callbackError) && (
          <p className="mt-3 text-sm text-[var(--error)]">{error || callbackError}</p>
        )}
      </div>
    </div>
  );
}
