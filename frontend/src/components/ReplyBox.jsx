import { useState, useRef, useEffect } from "react";
import { displaySender } from "../utils/formatters";

export default function ReplyBox({ email, onCancel, onSubmit }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  // Determine the default recipient
  const rawSender = email?.providerSender || email?.sender || "";
  const cleanRecipientName = displaySender(rawSender);
  
  // Extract email address from sender
  const emailMatch = rawSender.match(/<([^>]+)>/) || rawSender.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const senderEmail = emailMatch ? (emailMatch[1] || emailMatch[0]) : rawSender;
  
  const [recipient, setRecipient] = useState(senderEmail);
  const defaultSubject = email?.subject
    ? (/^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`)
    : "Re: (no subject)";
  const [subject, setSubject] = useState(defaultSubject);

  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit(e);
    }
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      await onSubmit({
        body: body.trim(),
        to: recipient ? [recipient] : undefined,
        subject
      });
    } catch (err) {
      setError(err.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="reply-box modern-reply-box" onSubmit={submit}>
      <div className="reply-header">
        <div className="reply-meta">
          <span className="reply-icon">↩</span>
          <span className="reply-to-text">Replying to:</span>
          <span className="reply-recipient-chip" title={recipient}>
            <strong>{cleanRecipientName}</strong> {senderEmail && <small>({senderEmail})</small>}
          </span>
        </div>
        <div className="reply-header-actions">
          <button
            type="button"
            className="reply-text-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide Details" : "Edit To / Subject"}
          </button>
          <button
            type="button"
            className="reply-close-btn"
            onClick={onCancel}
            title="Discard reply"
            aria-label="Discard reply"
          >
            ✕
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="reply-extra-fields">
          <div className="reply-field-row">
            <label>To:</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div className="reply-field-row">
            <label>Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        className="reply-textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Write your reply to ${cleanRecipientName}... (Ctrl+Enter to send)`}
        rows="6"
        disabled={sending}
      />

      {error && <p className="form-error reply-error">{error}</p>}

      <div className="reply-footer">
        <span className="reply-hint">
          Tip: Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send
        </span>
        <div className="reply-actions">
          <button
            type="button"
            className="button button-quiet"
            onClick={onCancel}
            disabled={sending}
          >
            Discard
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={sending || !body.trim()}
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </form>
  );
}
