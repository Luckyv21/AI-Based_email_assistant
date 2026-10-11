import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/inbox", icon: "⌂", label: "Inbox" },
  { to: "/education", icon: "E", label: "Education" },
  { to: "/office", icon: "O", label: "Office" },
  { to: "/personal", icon: "P", label: "Personal" },
  { to: "/important", icon: "!", label: "Important" },
  { to: "/starred", icon: "★", label: "Starred" },
  { to: "/events", icon: "◷", label: "Events" },
  { to: "/sent", icon: "↗", label: "Sent" },
  { to: "/drafts", icon: "□", label: "Drafts" },
  { to: "/trash", icon: "⌫", label: "Trash" },
  { to: "/spam", icon: "⊘", label: "Spam" },
  { to: "/account", icon: "⚙", label: "Account" }
];

export default function Sidebar({ onCompose, open, onClose }) {
  const { user } = useAuth();
  const isConnected = Boolean(user?.google?.connected);

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-head">
        <span>Workspace</span>
        <button className="icon-button sidebar-close" onClick={onClose}>
          ×
        </button>
      </div>

      <nav>
        {links.map((link, index) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label}
            {index === 0 && <span className="nav-count">•</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="compose-button" onClick={onCompose}>
          <span>＋</span> Compose
        </button>
        <div className="sidebar-note">
          {isConnected ? (
            <>
              Connected to Gmail
              <br />
              <span className="status-dot" /> Live mailbox
            </>
          ) : (
            <>
              <NavLink to="/gmail-connect" style={{ color: "var(--ink)", textDecoration: "underline" }}>
                Connect Gmail
              </NavLink>
              <br />
              <span className="status-dot" style={{ background: "#eab308" }} /> Not connected
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
