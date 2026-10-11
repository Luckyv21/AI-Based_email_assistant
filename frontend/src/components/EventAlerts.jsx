import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getEventAlerts, dismissEventAlert, restoreEventAlert } from "../api/events";

export function EventAlertsDropdown() {
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [undoAlert, setUndoAlert] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      const data = await getEventAlerts();
      const newAlerts = data.alerts || [];
      const newDismissed = data.dismissedAlerts || [];
      setAlerts(newAlerts);
      setDismissedAlerts(newDismissed);

      // Trigger desktop notification for imminent alerts if permission granted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        newAlerts.forEach((alert) => {
          if (alert.urgency === "imminent" && !alert.reminderSent) {
            new Notification(`Event Alert: ${alert.title}`, {
              body: `${alert.alertMessage} (${alert.timeRemaining})`,
              icon: "/favicon.ico"
            });
          }
        });
      }
    } catch {
      // Non-blocking fetch failure
    }
  };

  useEffect(() => {
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 25000); // refresh every 25 seconds
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === "granted") {
        new Notification("Event Alerts Enabled", {
          body: "You will now receive desktop notifications for upcoming email events and meetings!",
          icon: "/favicon.ico"
        });
      }
    }
  };

  const handleDismiss = async (e, alert) => {
    e.stopPropagation();
    try {
      await dismissEventAlert(alert.eventId);
      setAlerts((prev) => prev.filter((a) => a.eventId !== alert.eventId));
      setDismissedAlerts((prev) => [alert, ...prev]);
      setUndoAlert(alert);

      // Auto-clear undo toast after 8 seconds
      setTimeout(() => {
        setUndoAlert((current) => (current?.eventId === alert.eventId ? null : current));
      }, 8000);
    } catch {
      // silently ignore
    }
  };

  const handleRestore = async (e, alert) => {
    e.stopPropagation();
    try {
      await restoreEventAlert(alert.eventId);
      setDismissedAlerts((prev) => prev.filter((a) => a.eventId !== alert.eventId));
      setAlerts((prev) => [alert, ...prev]);
      if (undoAlert?.eventId === alert.eventId) {
        setUndoAlert(null);
      }
    } catch {
      // silently ignore
    }
  };

  const handleNavigateToEvent = () => {
    setIsOpen(false);
    navigate("/events");
  };

  const getUrgencyBadgeStyle = (urgency) => {
    switch (urgency) {
      case "imminent":
        return { background: "#ef4444", color: "#fff" };
      case "today":
        return { background: "#f59e0b", color: "#111" };
      case "tomorrow":
        return { background: "#3b82f6", color: "#fff" };
      default:
        return { background: "var(--color-surface-hover, #64748b)", color: "#fff" };
    }
  };

  return (
    <div className="alert-dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="icon-button alert-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Event Alerts & Reminders"
        aria-label="Event Alerts"
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "1.25rem",
          padding: "6px 10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <span role="img" aria-label="bell">🔔</span>
        {alerts.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "4px",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "0.72rem",
              fontWeight: "700",
              minWidth: "18px",
              height: "18px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px var(--color-surface, #fff)"
            }}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="alert-dropdown-popover"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "380px",
            maxWidth: "92vw",
            background: "var(--color-surface, #1e293b)",
            color: "var(--color-text, #f8fafc)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            border: "1px solid var(--color-border, rgba(255, 255, 255, 0.1))",
            zIndex: 1000,
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border, rgba(255, 255, 255, 0.1))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.1rem" }}>🔔</span>
              <strong style={{ fontSize: "0.95rem" }}>Event Alerts</strong>
            </div>
            {notifPermission === "default" && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                style={{
                  fontSize: "0.75rem",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: "1px solid #3b82f6",
                  background: "transparent",
                  color: "#3b82f6",
                  cursor: "pointer"
                }}
              >
                Desktop Alerts
              </button>
            )}
          </div>

          {/* Tab Selector: Active vs Muted/Dismissed */}
          <div
            style={{
              display: "flex",
              background: "rgba(0, 0, 0, 0.15)",
              borderBottom: "1px solid var(--color-border, rgba(255, 255, 255, 0.08))"
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: "0.82rem",
                fontWeight: activeTab === "active" ? "700" : "500",
                background: activeTab === "active" ? "var(--color-surface, #1e293b)" : "transparent",
                color: activeTab === "active" ? "#38bdf8" : "#94a3b8",
                border: "none",
                borderBottom: activeTab === "active" ? "2px solid #38bdf8" : "2px solid transparent",
                cursor: "pointer"
              }}
            >
              Active ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dismissed")}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: "0.82rem",
                fontWeight: activeTab === "dismissed" ? "700" : "500",
                background: activeTab === "dismissed" ? "var(--color-surface, #1e293b)" : "transparent",
                color: activeTab === "dismissed" ? "#38bdf8" : "#94a3b8",
                border: "none",
                borderBottom: activeTab === "dismissed" ? "2px solid #38bdf8" : "2px solid transparent",
                cursor: "pointer"
              }}
            >
              Muted / Dismissed ({dismissedAlerts.length})
            </button>
          </div>

          {/* Undo Banner if an alert was just dismissed */}
          {undoAlert && (
            <div
              style={{
                background: "#0f766e",
                color: "#ffffff",
                padding: "8px 14px",
                fontSize: "0.82rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span>Dismissed "{undoAlert.title}"</span>
              <button
                type="button"
                onClick={(e) => handleRestore(e, undoAlert)}
                style={{
                  background: "#ffffff",
                  color: "#0f766e",
                  border: "none",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                ↩ Undo (Add Back)
              </button>
            </div>
          )}

          {/* List Content */}
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {activeTab === "active" ? (
              alerts.length === 0 ? (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎉</div>
                  <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>No upcoming alerts</div>
                  <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                    You are all caught up on scheduled events!
                  </div>
                  {dismissedAlerts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("dismissed")}
                      style={{
                        marginTop: "12px",
                        background: "transparent",
                        border: "1px solid #64748b",
                        color: "#94a3b8",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "0.78rem",
                        cursor: "pointer"
                      }}
                    >
                      View {dismissedAlerts.length} Muted Alert{dismissedAlerts.length === 1 ? "" : "s"}
                    </button>
                  )}
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.eventId}
                    onClick={handleNavigateToEvent}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--color-border, rgba(255, 255, 255, 0.05))",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover, rgba(255, 255, 255, 0.05))")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontWeight: "600", fontSize: "0.92rem", flex: 1 }}>
                        {alert.title}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                          ...getUrgencyBadgeStyle(alert.urgency)
                        }}
                      >
                        {alert.timeRemaining}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {alert.eventTime && <span>⏰ {alert.eventTime}</span>}
                      {alert.location && <span>📍 {alert.location}</span>}
                      {alert.category && <span>🏷️ {alert.category}</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(e, alert)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          padding: "2px 6px",
                          borderRadius: "4px"
                        }}
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* Dismissed / Muted Tab */
              dismissedAlerts.length === 0 ? (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>🔕</div>
                  <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>No dismissed alerts</div>
                  <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                    Any alerts you dismiss will appear here so you can re-enable them.
                  </div>
                </div>
              ) : (
                dismissedAlerts.map((alert) => (
                  <div
                    key={alert.eventId}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--color-border, rgba(255, 255, 255, 0.05))",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontWeight: "600", fontSize: "0.92rem", color: "#94a3b8", flex: 1 }}>
                        {alert.title} (Muted)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleRestore(e, alert)}
                        style={{
                          background: "#22c55e",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        🔔 Add Back / Enable
                      </button>
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {alert.eventTime && <span>⏰ {alert.eventTime}</span>}
                      {alert.location && <span>📍 {alert.location}</span>}
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          <div
            style={{
              padding: "10px 16px",
              background: "var(--color-surface-hover, rgba(255, 255, 255, 0.03))",
              textAlign: "center",
              borderTop: "1px solid var(--color-border, rgba(255, 255, 255, 0.1))"
            }}
          >
            <button
              type="button"
              onClick={handleNavigateToEvent}
              style={{
                background: "transparent",
                border: "none",
                color: "#3b82f6",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              View Full Events Calendar ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EventAlertsBanner({ alerts = [], onDismiss, onRestore, lastDismissed }) {
  if ((!alerts || alerts.length === 0) && !lastDismissed) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        borderRadius: "12px",
        padding: "14px 18px",
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", color: "#f87171" }}>
          <span>⚡</span>
          <span>Active Event Reminders & Alerts ({alerts.length})</span>
        </div>

        {lastDismissed && onRestore && (
          <button
            type="button"
            onClick={() => onRestore(lastDismissed)}
            style={{
              background: "#22c55e",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            ↩ Undo Dismissal ({lastDismissed.title})
          </button>
        )}
      </div>

      {alerts.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
          {alerts.map((alert) => (
            <div
              key={alert.eventId}
              style={{
                background: "var(--color-surface, rgba(255, 255, 255, 0.05))",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "8px"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{alert.title}</div>
                <div style={{ fontSize: "0.82rem", color: "#fbbf24" }}>
                  ⏳ {alert.timeRemaining} {alert.eventTime ? `(${alert.eventTime})` : ""}
                </div>
                {alert.location && (
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>📍 {alert.location}</div>
                )}
              </div>

              {onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(alert)}
                  title="Dismiss alert"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    padding: "2px"
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
