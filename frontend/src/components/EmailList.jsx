import EmailRow from "./EmailRow";
import EmptyState from "./EmptyState";
export default function EmailList({ emails, onStar, onRead }) { if (!emails.length) return <EmptyState />; return <div className="email-list">{emails.map((email) => <EmailRow key={email._id} email={email} onStar={onStar} onRead={onRead} />)}</div>; }
