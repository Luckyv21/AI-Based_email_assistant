import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      <button className="icon-button menu-trigger" onClick={onMenu} aria-label="Open navigation">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Brand matching Login/Register */}
      <Link to="/inbox" className="wordmark">
        <img src="/mailistor-logo-transparent.png" alt="Mailistor" className="topbar-logo-img" />
        <span className="wordmark-pill">v2.0</span>
      </Link>

      {/* Search Input */}
      <form className="search" onSubmit={submit}>
        <span className="search-icon">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emails, senders, or topics..."
          aria-label="Search mailbox"
        />
      </form>

      {/* Mobile Compose button */}
      <button className="button compose-mobile" onClick={onCompose}>
        Compose
      </button>

      {/* Action Controls */}
      <div className="topbar-actions">
        <EventAlertsDropdown />

        {/* User Profile */}
        <div
          className="profile"
          ref={profileRef}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          role="button"
          tabIndex={0}
        >
          <span className="avatar">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </span>
          <span className="profile-name">{user?.name || "Workspace"}</span>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#94a3b8" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <strong>{user?.name || "Workspace User"}</strong>
                <span>{user?.email || "Connected account"}</span>
              </div>
              <div className="dropdown-divider"></div>

              <button
                type="button"
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(false);
                  navigate("/account");
                }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Account Settings</span>
              </button>

              <button
                type="button"
                className="dropdown-item danger"
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
