import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { useLogin } from "../login";
import Spinner from "../element/spinner";

/**
 * Callback page for mobile NIP-46 nostrconnect:// flow.
 * After the signer app approves the connection, it redirects here.
 * This page checks if login was successful and redirects to home.
 */
export default function LoginCallback() {
  const navigate = useNavigate();
  const login = useLogin();
  const [checkCount, setCheckCount] = useState(0);
  const [status, setStatus] = useState<"checking" | "success" | "timeout">("checking");

  const isLoggedIn = login.type !== "none" && !!login.pubkey;

  useEffect(() => {
    if (isLoggedIn) {
      setStatus("success");
      const timer = setTimeout(() => {
        // Try to close this tab (works if opened by signer app)
        window.close();
        // If we're still here (close didn't work), redirect to home
        navigate("/");
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Check periodically for login (in case of race condition)
    if (checkCount < 20 && status === "checking") {
      const timer = setTimeout(() => {
        setCheckCount((c) => c + 1);
      }, 500);
      return () => clearTimeout(timer);
    }

    // After 10 seconds of checking, show timeout
    if (checkCount >= 20 && status === "checking") {
      setStatus("timeout");
    }
  }, [isLoggedIn, checkCount, navigate, status]);

  // Listen for storage events (login from another context)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "session" && e.newValue) {
        try {
          const session = JSON.parse(e.newValue);
          if (session.type !== "none" && session.pubkey) {
            setStatus("success");
            setTimeout(() => {
              window.close();
              navigate("/");
            }, 1500);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 p-4">
      {status === "checking" && (
        <>
          <Spinner className="w-12 h-12" />
          <p className="text-foreground-2 text-center">
            <FormattedMessage defaultMessage="Completing login..." id="5cKv5k" />
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-5xl">✓</div>
          <p className="text-foreground text-center font-semibold">
            <FormattedMessage defaultMessage="Login successful!" id="xXcpjP" />
          </p>
          <p className="text-foreground-2 text-center text-sm">
            <FormattedMessage defaultMessage="Redirecting..." id="4ChXDF" />
          </p>
        </>
      )}

      {status === "timeout" && (
        <>
          <p className="text-foreground-2 text-center">
            <FormattedMessage
              defaultMessage="Login is taking longer than expected. You may need to return to the login page."
              id="g3LvS4"
            />
          </p>
          <button onClick={() => navigate("/login")} className="text-primary hover:underline">
            <FormattedMessage defaultMessage="Back to login" id="VKuJG5" />
          </button>
        </>
      )}
    </div>
  );
}
