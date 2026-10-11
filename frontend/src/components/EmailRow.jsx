import { Link } from "react-router-dom";
import CategoryBadge from "./CategoryBadge";
import PriorityBadge from "./PriorityBadge";
import { displaySender, formatDate, readableBody } from "../utils/formatters";

export default function EmailRow({ email, onStar, onRead }) {
  return (
    <article className={`email-row ${email.isRead ? "read" : "unread"}`}>
      {/* Star button */}
      <button
        type="button"
        className={`star-button ${email.isStarred ? "starred" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          onStar(email);
        }}
        aria-label={email.isStarred ? "Unstar email" : "Star email"}
      >
        {email.isStarred ? (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ) : (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        )}
      </button>

      {/* Main Link to Detail */}
      <Link className="email-link" to={`/inbox/${email._id}`}>
        <div className="sender-cell">
          <span className="sender-name">{displaySender(email.providerSender || email.sender)}</span>
        </div>

        <div className="subject-cell">
          <strong>{email.subject || "(no subject)"}</strong>
          <span>— {readableBody(email.body).replace(/\s+/g, " ").slice(0, 90)}</span>
        </div>

        <div className="row-badges">
          {email.hasEvent && (
            <span className="badge badge-event">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Event
            </span>
          )}
          <CategoryBadge value={email.category} />
          <PriorityBadge value={email.priority} />
        </div>

        <div className="date-cell">
          {formatDate(email.providerDate || email.createdAt)}
        </div>
      </Link>

      {/* Read / Unread toggle */}
      <button
        type="button"
        className="read-toggle"
        onClick={(e) => {
          e.preventDefault();
          onRead(email);
        }}
        aria-label={email.isRead ? "Mark unread" : "Mark read"}
        title={email.isRead ? "Mark as unread" : "Mark as read"}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r={email.isRead ? "3" : "6"} opacity={email.isRead ? "0.3" : "1"} />
        </svg>
      </button>
    </article>
  );
}
