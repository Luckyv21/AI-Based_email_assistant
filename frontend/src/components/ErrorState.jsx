import { useAuth } from "../context/AuthContext";

export default function ErrorState({ message, onRetry }) {
  const { connectGoogle } = useAuth();
  const isNotConnected = message?.toLowerCase()?.includes("not connected");

  if (isNotConnected) {
    return (
      <div className="empty-state">
        <span className="empty-icon">✉</span>
        <h3>Gmail Not Connected</h3>
        <p>This account does not have Gmail connected yet. Connect your Gmail to start viewing and categorizing your emails.</p>
        <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
          <button className="button button-primary" onClick={connectGoogle}>
            Connect Gmail
          </button>
          {onRetry && (
            <button className="button button-quiet" onClick={onRetry}>
              Refresh Mailbox
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="empty-state error-state">
      <span className="empty-icon">!</span>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="button button-quiet" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
