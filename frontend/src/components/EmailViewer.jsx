import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMessage, replyMessage } from "../api/gmail";
import { useEmails } from "../context/EmailContext";
import Loading from "./Loading";
import ErrorState from "./ErrorState";
import AIAnalysis from "./AIAnalysis";
import ReplyBox from "./ReplyBox";
import { displaySender, fullDate, readableBody } from "../utils/formatters";

export default function EmailViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { markRead, toggleStar } = useEmails();
  const [email, setEmail] = useState(null);
  const [error, setError] = useState("");
  const [replying, setReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  const replyBoxRef = useRef(null);

  useEffect(() => {
    getMessage(id)
      .then((data) => setEmail(data.email))
      .catch((e) => setError(e.message));
  }, [id]);

  const openReply = () => {
    setReplying(true);
    setTimeout(() => {
      replyBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      replyBoxRef.current?.querySelector("textarea")?.focus();
    }, 60);
  };

  const handleToggleReply = () => {
    if (replying) {
      setReplying(false);
    } else {
      openReply();
    }
  };

  const reply = async (payload) => {
    await replyMessage(email._id, payload);
    setReplying(false);
    setReplySuccess(true);
    setTimeout(() => setReplySuccess(false), 6000);
  };

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!email) return <Loading label="Loading message" />;

  const senderName = displaySender(email.providerSender || email.sender);

  return (
    <div className="viewer">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back to mailbox
      </button>

      <div className="viewer-head">
        <div>
          <div className="eyebrow">{email.folder} / message</div>
          <h1>{email.subject || "(no subject)"}</h1>
        </div>
        <div className="viewer-actions">
          <button className="icon-button" onClick={() => toggleStar(email)}>
            {email.isStarred ? "★" : "☆"}
          </button>
          <button className="button button-quiet" onClick={() => markRead(email)}>
            {email.isRead ? "Mark unread" : "Mark read"}
          </button>
          <button
            className={`button ${replying ? "button-active" : ""}`}
            onClick={handleToggleReply}
            title={replying ? "Close reply form" : "Reply to this email"}
          >
            {replying ? "Close Reply" : "Reply"}
          </button>
        </div>
      </div>

      <div className="message-card">
        <div className="message-meta">
          <div className="avatar large">
            {senderName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <strong>{senderName}</strong>
            <span>To: {email.providerRecipients?.join(", ") || "recipient unavailable"}</span>
          </div>
          <time>{fullDate(email.providerDate || email.createdAt)}</time>
        </div>

        <div className="message-body">
          {readableBody(email.body) || "No message body"}
        </div>

        {email.attachments?.length > 0 && (
          <div className="attachments">
            <span>Attachments</span>
            {email.attachments.map((item) => (
              <div key={item.providerAttachmentId || item.filename}>
                ◫ {item.filename} <small>{item.mimetype}</small>
              </div>
            ))}
          </div>
        )}

        {!replying && (
          <div className="message-bottom-actions">
            <button className="button button-reply-quick" onClick={openReply}>
              ↩ Reply to {senderName}
            </button>
          </div>
        )}
      </div>

      {replySuccess && (
        <div className="reply-success-banner">
          <span className="success-icon">✓</span>
          <span>Your reply was successfully sent via Gmail!</span>
        </div>
      )}

      {replying && (
        <div ref={replyBoxRef}>
          <ReplyBox
            email={email}
            onCancel={() => setReplying(false)}
            onSubmit={reply}
          />
        </div>
      )}

      <AIAnalysis email={email} onEmailUpdated={setEmail} />
    </div>
  );
}
