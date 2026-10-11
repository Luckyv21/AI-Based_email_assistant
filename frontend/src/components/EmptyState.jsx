import { useAuth } from "../context/AuthContext";

export default function EmptyState({
  title,
  text,
  action = null
}) {
  const { user, connectGoogle } = useAuth();
  const isConnected = Boolean(user?.google?.connected);

  const resolvedTitle = title || (isConnected ? "No emails found" : "Gmail Not Connected");
  const resolvedText = text || (
    isConnected
      ? "Your connected mailbox has nothing here yet."
      : `This account (${user?.email || "your account"}) is not connected to Gmail yet. Connect your Gmail to start viewing and organizing your emails.`
  );

  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3>{resolvedTitle}</h3>
      <p>{resolvedText}</p>
      {action ? (
        <div style={{ marginTop: "16px" }}>{action}</div>
      ) : (
        !isConnected && (
          <div style={{ marginTop: "16px" }}>
            <button className="button button-primary" onClick={connectGoogle}>
              Connect Gmail
            </button>
          </div>
        )
      )}
    </div>
  );
}
