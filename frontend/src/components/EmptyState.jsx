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
      <span className="empty-icon">{isConnected ? "⌁" : "✉"}</span>
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
