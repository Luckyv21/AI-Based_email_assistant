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
            <button className="button" onClick={doSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Gmail"}
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
            background: "#fef3c7",
            borderColor: "#fde68a",
            color: "#92400e"
          }}
        >
          <div>
            <strong>Gmail not connected.</strong> Connect your account to automatically sync and classify emails.
          </div>
          <button
            className="button button-primary"
            style={{ padding: "6px 14px", fontSize: "13px" }}
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
            padding: "10px 14px"
          }}
        >
          <span>{syncError}</span>
          <button
            type="button"
            className="button button-quiet"
            style={{ padding: "2px 8px", fontSize: "12px", background: "none", border: "none" }}
            onClick={() => setSyncError("")}
          >
            ✕
          </button>
        </div>
      )}

      <div className="summary-strip">
        <div>
          <strong>{visibleEmails.length || pagination.total || 0}</strong>
          <span>Messages</span>
        </div>
        <div>
          <strong>
            {emails.filter((email) => priorityMatch(email.priority, "Important")).length}
          </strong>
          <span>Important</span>
        </div>
        <div>
          <strong>{emails.filter((email) => email.hasEvent).length}</strong>
          <span>Events detected</span>
        </div>
        <div className="summary-note">
          {search ? `Results for “${search}”` : `Displaying classified ${title} messages`}
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
