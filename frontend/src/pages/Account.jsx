import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEmails } from "../context/EmailContext";

export default function Account() {
  const { user, updateProfile, connectGoogle, disconnectGoogle, logout, refreshUser } = useAuth();
  const { sync } = useEmails();

  const [name, setName] = useState(user?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState("");
  const [nameError, setNameError] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState("");

  const [notifPermission, setNotifPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );

  const isConnected = Boolean(user?.google?.connected);
  const connectedEmail = user?.google?.email || user?.email || "";

  useEffect(() => {
    refreshUser?.();
  }, []);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    setNameError("");
    setNameSuccess("");
    try {
      await updateProfile(name.trim());
      setIsEditingName(false);
      setNameSuccess("Profile name updated successfully!");
      setTimeout(() => setNameSuccess(""), 4000);
    } catch (err) {
      setNameError(err.message || "Failed to update profile name");
    } finally {
      setSavingName(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError("");
    setSyncResult(null);
    try {
      const res = await sync();
      setSyncResult(res);
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      setSyncError(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === "granted") {
        new Notification("Desktop Notifications Enabled", {
          body: "You will now receive desktop notifications for event reminders!",
          icon: "/favicon.ico"
        });
      }
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "8px 0 40px" }}>
      {/* Page Header */}
      <div className="page-heading" style={{ marginBottom: "28px" }}>
        <span className="eyebrow">Settings & Preferences</span>
        <h1>Manage Account</h1>
        <p>Manage your personal profile, connected Gmail accounts, and AI preferences.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* 1. Profile Information Card */}
        <div
          className="message-card"
          style={{
            padding: "24px",
            borderRadius: "12px",
            background: "var(--color-surface, #ffffff)",
            border: "1px solid var(--color-border, #e2e8f0)"
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>👤</span>
            <span>Profile Information</span>
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                fontWeight: "700"
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {isEditingName ? (
                  <form onSubmit={handleSaveName} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--color-border, #cbd5e1)",
                        fontSize: "0.95rem"
                      }}
                      autoFocus
                    />
                    <button type="submit" className="button" style={{ padding: "6px 12px", fontSize: "0.85rem" }} disabled={savingName}>
                      {savingName ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="button button-quiet"
                      style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                      onClick={() => {
                        setName(user?.name || "");
                        setIsEditingName(false);
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{user?.name || "Account User"}</h2>
                    <button
                      type="button"
                      className="button button-quiet"
                      style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                      onClick={() => setIsEditingName(true)}
                    >
                      ✎ Edit Name
                    </button>
                  </>
                )}
              </div>
              <div style={{ color: "var(--muted, #64748b)", fontSize: "0.9rem", marginTop: "4px" }}>
                {user?.email || "No email"}
              </div>
            </div>
          </div>

          {nameSuccess && (
            <div style={{ background: "#dcfce7", color: "#166534", padding: "8px 12px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
              ✓ {nameSuccess}
            </div>
          )}
          {nameError && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
              ✕ {nameError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", paddingTop: "14px", borderTop: "1px solid var(--color-border, #f1f5f9)", fontSize: "0.85rem" }}>
            <div>
              <span style={{ color: "var(--muted, #64748b)" }}>User Account ID:</span>
              <div style={{ fontFamily: "monospace", fontSize: "0.8rem", marginTop: "2px", wordBreak: "break-all" }}>
                {user?.id || user?._id || "N/A"}
              </div>
            </div>
            <div>
              <span style={{ color: "var(--muted, #64748b)" }}>Primary Role:</span>
              <div style={{ fontWeight: "600", marginTop: "2px" }}>User / Mailbox Owner</div>
            </div>
          </div>
        </div>

        {/* 2. Google & Gmail Integration Card */}
        <div
          className="message-card"
          style={{
            padding: "24px",
            borderRadius: "12px",
            background: "var(--color-surface, #ffffff)",
            border: "1px solid var(--color-border, #e2e8f0)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📬</span>
                <span>Gmail & Google Account Integration</span>
              </h3>
              <p style={{ margin: 0, color: "var(--muted, #64748b)", fontSize: "0.88rem" }}>
                Connect your Google mailbox to enable AI classification and automated event syncing.
              </p>
            </div>

            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "700",
                padding: "4px 10px",
                borderRadius: "20px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: isConnected ? "#dcfce7" : "#fef3c7",
                color: isConnected ? "#166534" : "#92400e"
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: isConnected ? "#22c55e" : "#f59e0b"
                }}
              />
              {isConnected ? "Connected" : "Not Connected"}
            </span>
          </div>

          <div style={{ background: "rgba(0, 0, 0, 0.03)", padding: "14px 16px", borderRadius: "8px", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>Linked Mailbox Address:</div>
            <div style={{ fontWeight: "600", fontSize: "0.95rem", marginTop: "2px" }}>
              {connectedEmail || "No mailbox linked"}
            </div>
          </div>

          {syncResult && (
            <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
              ✓ Sync complete! Fetched {syncResult.fetched || 0} messages ({syncResult.inserted || 0} new, {syncResult.updated || 0} updated).
            </div>
          )}

          {syncError && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "14px" }}>
              ✕ {syncError}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {isConnected ? (
              <>
                <button
                  type="button"
                  className="button"
                  onClick={handleSync}
                  disabled={syncing}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem" }}
                >
                  <span>{syncing ? "⏳" : "↻"}</span>
                  <span>{syncing ? "Syncing..." : "Sync Emails Now"}</span>
                </button>

                <button
                  type="button"
                  className="button button-quiet"
                  onClick={connectGoogle}
                  style={{ fontSize: "0.88rem" }}
                >
                  Switch / Reconnect Account
                </button>

                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to disconnect your Google account? You will be signed out.")) {
                      disconnectGoogle();
                    }
                  }}
                  style={{ color: "#dc2626", fontSize: "0.88rem" }}
                >
                  Disconnect Gmail
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button"
                onClick={connectGoogle}
                style={{ background: "#4285f4", color: "#ffffff", fontSize: "0.88rem" }}
              >
                Connect with Google
              </button>
            )}
          </div>
        </div>

        {/* 3. AI Intelligence & Notification Preferences */}
        <div
          className="message-card"
          style={{
            padding: "24px",
            borderRadius: "12px",
            background: "var(--color-surface, #ffffff)",
            border: "1px solid var(--color-border, #e2e8f0)"
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🤖</span>
            <span>AI Models & Notification Preferences</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "18px" }}>
            <div style={{ border: "1px solid var(--color-border, #f1f5f9)", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontWeight: "700", fontSize: "0.92rem", marginBottom: "4px" }}>SECD Multi-Task DistilBERT</div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
                Classifies emails into Education, Office, and Personal categories, and scores importance priority.
              </p>
              <span style={{ display: "inline-block", marginTop: "8px", fontSize: "0.72rem", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
                Active & Running
              </span>
            </div>

            <div style={{ border: "1px solid var(--color-border, #f1f5f9)", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontWeight: "700", fontSize: "0.92rem", marginBottom: "4px" }}>MailEx BiLSTM NER</div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
                Detects event titles, meeting dates, times, and venues from your email text with auto-updating.
              </p>
              <span style={{ display: "inline-block", marginTop: "8px", fontSize: "0.72rem", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
                Active & Running
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingTop: "14px", borderTop: "1px solid var(--color-border, #f1f5f9)" }}>
            <div>
              <div style={{ fontWeight: "600", fontSize: "0.92rem" }}>Desktop Push Alerts</div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
                Status: {notifPermission === "granted" ? "🟢 Enabled" : notifPermission === "denied" ? "🔴 Blocked by browser" : "🟡 Not configured"}
              </div>
            </div>

            {notifPermission !== "granted" && (
              <button
                type="button"
                className="button button-quiet"
                onClick={requestNotifications}
                style={{ fontSize: "0.82rem" }}
              >
                Enable Desktop Alerts
              </button>
            )}
          </div>
        </div>

        {/* 4. Session & Navigation Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
          <Link to="/events" className="button button-quiet" style={{ textDecoration: "none" }}>
            📅 Go to Events Calendar
          </Link>

          <button
            type="button"
            className="button button-quiet"
            onClick={logout}
            style={{ color: "#dc2626" }}
          >
            Log Out of Session
          </button>
        </div>
      </div>
    </div>
  );
}
