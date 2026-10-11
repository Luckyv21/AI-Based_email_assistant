import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEmails } from "../context/EmailContext";
import { EventAlertsDropdown } from "./EventAlerts";

export default function Topbar({ onMenu, onCompose }) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { loadEmails } = useEmails();
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const value = search.trim();
    navigate(`/inbox${value ? `?search=${encodeURIComponent(value)}` : ""}`);
    loadEmails(value ? { search: value, page: 1 } : { page: 1 });
  };

  return (
    <header className="topbar">
      <button className="icon-button menu-trigger" onClick={onMenu} aria-label="Open navigation">☰</button>
      <div className="wordmark">
        <span className="wordmark-mark">A</span>
        <span>Aura</span>
      </div>
      <form className="search" onSubmit={submit}>
        <span>⌕</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your mailbox" aria-label="Search mailbox" />
      </form>
      <button className="button compose-mobile" onClick={onCompose}>Compose</button>
      
      <EventAlertsDropdown />

      <div className="profile" ref={profileRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
        <span className="avatar">{user?.name?.[0]?.toUpperCase() || "U"}</span>
        <span className="profile-name">{user?.name || "Account"}</span>
        
        {dropdownOpen && (
          <div className="profile-dropdown">
            <div className="dropdown-header">
              <strong>{user?.name || "Account"}</strong>
              <span>{user?.email || ""}</span>
            </div>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); /* Manage action here */ }}>
              Manage Account
            </button>
            <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); logout(); }}>
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
