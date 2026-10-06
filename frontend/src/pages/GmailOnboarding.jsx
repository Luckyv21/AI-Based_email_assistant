import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEmails } from "../context/EmailContext";

export default function GmailOnboarding() {
  const { user, connectGoogle, disconnectGoogle, refreshUser } = useAuth();
  const { sync } = useEmails();
  const [searchParams, setSearchParams] = useSearchParams();

  const isUserConnected = Boolean(user?.google?.connected);
  const [connected, setConnected] = useState(
    isUserConnected || searchParams.get("connected") === "true"
  );
  const [state, setState] = useState("");
  const [result, setResult] = useState(null);
  const [syncStatusText, setSyncStatusText] = useState("Syncing emails...");

  useEffect(() => {
    refreshUser?.();
  }, []);

  useEffect(() => {
    if (user) {
      const isConn = Boolean(user?.google?.connected);
      setConnected(isConn);
      if (!isConn) {
        localStorage.removeItem("email_assistant_gmail_connected");
      }
    }
  }, [user]);

  useEffect(() => {
    if (state === "Syncing emails...") {
      const texts = [
        "Connecting to Gmail...",
        "Downloading messages...",
        "Applying AI categories...",
        "Organizing your workspace...",
        "Almost there..."
      ];
      let i = 0;
      setSyncStatusText(texts[0]);
      const interval = setInterval(() => {
        i = (i + 1) % texts.length;
        setSyncStatusText(texts[i]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [state]);

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      setConnected(true);
      localStorage.setItem("email_assistant_gmail_connected", "true");

      const tokenParam = searchParams.get("token");
      const userParam = searchParams.get("user");
      if (tokenParam && userParam) {
        try {
          localStorage.setItem("email_assistant_token", tokenParam);
          localStorage.setItem("email_assistant_user", userParam);
          window.location.replace("/inbox");
          return;
        } catch (e) {
          console.error("Failed to parse Google sign-in redirect:", e);
        }
      }

      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const oauthError = searchParams.get("error");

  const runSync = async () => {
    setState("Syncing emails...");
    setResult(null);
    try {
      const data = await sync();
      setResult(data);
      setState("Complete");
    } catch (error) {
      const msg = error.message || "Sync failed";
      if (msg.includes("not connected")) {
        setConnected(false);
        localStorage.removeItem("email_assistant_gmail_connected");
      }
      setState(msg);
    }
  };

  const disconnect = async () => {
    await disconnectGoogle();
    localStorage.removeItem("email_assistant_gmail_connected");
    setConnected(false);
  };

  return (
    <div className="onboarding">
      <span className="eyebrow">Connection</span>
      <h1>{connected ? "Your Gmail is connected" : "Connect your Gmail"}</h1>
      <p className="lead">Bring your real mailbox into a focused workspace.</p>

      {oauthError && (
        <p className="form-error">
          Google authorization failed. Please try connecting again.
        </p>
      )}

      {connected ? (
        <>
          <div className="connection-status">
            <span className="status-dot" /> Gmail connected
          </div>
          <div className="steps">
            <span>✓ Gmail connected</span>
            <span className={state === "Complete" ? "done" : ""}>
              {state === "Syncing emails..." ? (
                <span className="sync-progress">
                  <span className="spinner"></span>
                  <span className="sync-text">{syncStatusText}</span>
                </span>
              ) : (
                state || "Ready to sync emails"
              )}
            </span>
            {result && (
              <span className="done">✓ {result.fetched} emails synchronized</span>
            )}
          </div>

          {state && state !== "Complete" && state !== "Syncing emails..." && (
            <p className="form-error">{state}</p>
          )}

          <div className="onboarding-actions">
            <button
              className={`button ${state === "Syncing emails..." ? "button-syncing" : ""}`}
              onClick={runSync}
              disabled={state === "Syncing emails..."}
            >
              {state === "Syncing emails..." ? "Syncing..." : "Sync Gmail"}
            </button>
            <Link to="/inbox" className="button button-quiet">
              Go to Inbox
            </Link>
            <button className="button button-quiet" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="connect-list">
            <span>Organize your real email with categories</span>
            <span>See important messages at a glance</span>
            <span>Send and reply through Gmail</span>
          </div>
          {state && <p className="form-error">{state}</p>}
          <button className="button" onClick={connectGoogle}>
            Connect Gmail
          </button>
        </>
      )}
    </div>
  );
}
