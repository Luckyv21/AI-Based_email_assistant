import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEmails } from "../context/EmailContext";
import EmailList from "../components/EmailList";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

const categoryMatch = (emailCat, targetCat) => {
  if (!targetCat) return true;
  if (!emailCat) return false;
  const ec = emailCat.toLowerCase();
  const tc = targetCat.toLowerCase();
  if (tc.includes("edu") && (ec.includes("edu") || ec.includes("college"))) return true;
  if (tc.includes("office") && (ec.includes("office") || ec.includes("work"))) return true;
  if (tc.includes("personal") && ec.includes("personal")) return true;
  return ec === tc;
};

const priorityMatch = (emailPri, targetPri) => {
  if (!targetPri) return true;
  if (!emailPri) return false;
  const ep = emailPri.toLowerCase();
  const tp = targetPri.toLowerCase();
  if (tp === "important") {
    return ["important", "high", "urgent"].includes(ep);
  }
  return ep === tp;
};

export default function Inbox({ folder = "", title = "Inbox", filter = {} }) {
  const { user, connectGoogle } = useAuth();
  const { emails, pagination, loading, error, clearError, loadEmails, sync, markRead, toggleStar } = useEmails();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search).get("search") || "";

  const isConnected = Boolean(user?.google?.connected);

  const loadCurrentPage = (page = 1) =>
    loadEmails({
      page,
      limit: 25,
      ...(folder ? { folder } : {}),
      ...(search ? { search } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.starred ? { starred: "true" } : {})
    });

  useEffect(() => {
    loadCurrentPage(1);

    // Auto-refresh inbox every 20 seconds so newly received emails appear seamlessly without manual sync
    const interval = setInterval(() => {
      loadCurrentPage(1);
    }, 20000);

    return () => clearInterval(interval);
  }, [folder, search, filter.priority, filter.category, filter.starred]);

  const visibleEmails = emails.filter(
    (email) =>
      priorityMatch(email.priority, filter.priority) &&
      categoryMatch(email.category, filter.category) &&
      (!filter.starred || email.isStarred)
  );

  const doSync = async () => {
    if (!isConnected) {
      navigate("/gmail-connect");
      return;
    }
    setSyncing(true);
    setSyncError("");
    try {
      await sync(search);
      await loadCurrentPage(1);
    } catch (err) {
      setSyncError(err.message || "Failed to sync Gmail");
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = () => {
    clearError?.();
    loadCurrentPage(1);
  };

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Mailbox</span>
          <h1>{title}</h1>
          <p>{visibleEmails.length || pagination.total || 0} messages in view</p>
        </div>
        <div className="heading-actions">
          <button className="button button-quiet" onClick={() => navigate("/gmail-connect")}>
            Gmail status
          </button>
          {isConnected ? (
            <button className="button button-primary" onClick={doSync} disabled={syncing}>
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ animation: syncing ? "authSpin 0.7s linear infinite" : "none" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{syncing ? "Syncing..." : "Sync Gmail"}</span>
            </button>
          ) : (
            <button className="button button-primary" onClick={connectGoogle}>
              Connect Gmail
            </button>
          )}
        </div>
      </div>

      {!isConnected && (
        <div
          className="connection-status"
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "12px",
            padding: "14px 18px",
            color: "#92400e"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <div>
              <strong>Gmail is not connected.</strong> Connect your account to automatically sync and classify incoming emails.
            </div>
          </div>
          <button
            className="button button-primary"
            style={{ padding: "8px 16px", fontSize: "13px" }}
            onClick={connectGoogle}
          >
            Connect Gmail
          </button>
        </div>
      )}

      {syncError && (
        <div
          className="form-error"
          style={{
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b"
          }}
        >
          <span>{syncError}</span>
          <button
            type="button"
            className="button button-quiet"
            style={{ padding: "2px 8px", fontSize: "12px", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setSyncError("")}
          >
            ✕
          </button>
        </div>
      )}

      <div className="summary-strip">
        <div className="summary-metric-card">
          <div className="summary-metric-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="summary-metric-text">
            <strong>{visibleEmails.length || pagination.total || 0}</strong>
            <span>Total Messages</span>
          </div>
        </div>

        <div className="summary-metric-card">
          <div className="summary-metric-icon" style={{ background: "#fffbeb", color: "#b45309" }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="summary-metric-text">
            <strong>{emails.filter((email) => priorityMatch(email.priority, "Important")).length}</strong>
            <span>Important Threads</span>
          </div>
        </div>

        <div className="summary-metric-card">
          <div className="summary-metric-icon" style={{ background: "#eef2ff", color: "#4338ca" }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="summary-metric-text">
            <strong>{emails.filter((email) => email.hasEvent).length}</strong>
            <span>Events Detected</span>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading mailbox" />
      ) : (
        <>
          <EmailList emails={visibleEmails} onStar={toggleStar} onRead={markRead} />
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="button button-quiet"
                disabled={pagination.page <= 1}
                onClick={() => loadCurrentPage(pagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="button button-quiet"
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadCurrentPage(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
