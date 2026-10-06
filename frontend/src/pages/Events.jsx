import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEvents, updateEvent, deleteEvent, createEvent } from "../api/events";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import CategoryBadge from "../components/CategoryBadge";
import { formatDate } from "../utils/formatters";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    eventDate: new Date().toISOString().split("T")[0],
    eventTime: "",
    location: "",
    category: "Office/Work"
  });

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getEvents();
      setEvents(res.events || []);
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await updateEvent(id, { status });
      setEvents((prev) =>
        prev.map((ev) => (ev._id === id ? { ...ev, status } : ev))
      );
    } catch (err) {
      alert("Failed to update event: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((ev) => ev._id !== id));
    } catch (err) {
      alert("Failed to delete event: " + err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;
    try {
      await createEvent(newEvent);
      setShowAddModal(false);
      setNewEvent({
        title: "",
        eventDate: new Date().toISOString().split("T")[0],
        eventTime: "",
        location: "",
        category: "Office/Work"
      });
      loadEvents();
    } catch (err) {
      alert("Failed to create event: " + err.message);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filterStatus === "All") return true;
    return ev.status === filterStatus;
  });

  return (
    <section>
      <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="eyebrow">AI Calendar Intelligence</span>
          <h1>Events & Schedules</h1>
          <p>Structured events, meetings, and dates extracted by the BiLSTM AI Model</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="button button-quiet" onClick={loadEvents} disabled={loading}>
            ↻ Refresh
          </button>
          <button className="button" onClick={() => setShowAddModal(true)}>
            + New Event
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", margin: "16px 0 24px" }}>
        {["All", "Upcoming", "Completed", "Cancelled"].map((status) => (
          <button
            key={status}
            className={`button ${filterStatus === status ? "" : "button-quiet"}`}
            style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "20px" }}
            onClick={() => setFilterStatus(status)}
          >
            {status} ({events.filter((e) => status === "All" || e.status === status).length})
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading extracted events..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadEvents} />
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state message-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <span style={{ fontSize: "40px", display: "block", marginBottom: "12px" }}>📅</span>
          <h3>No events found</h3>
          <p className="muted" style={{ maxWidth: "440px", margin: "8px auto 20px" }}>
            {filterStatus === "All"
              ? "When emails contain meeting invites, deadlines, or schedules, the MailEx BiLSTM model will automatically extract them and display them here."
              : `No events currently marked as "${filterStatus}".`}
          </p>
          <button className="button" onClick={() => setShowAddModal(true)}>
            Create Event Manually
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filteredEvents.map((item) => (
            <div
              key={item._id}
              className="message-card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderLeft: item.status === "Cancelled" ? "4px solid #cbd5e1" : item.status === "Completed" ? "4px solid #22c55e" : "4px solid #8b5cf6",
                position: "relative"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <CategoryBadge value={item.category} />
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontWeight: 600,
                      background: item.status === "Completed" ? "#dcfce7" : item.status === "Cancelled" ? "#f1f5f9" : "#ede9fe",
                      color: item.status === "Completed" ? "#166534" : item.status === "Cancelled" ? "#64748b" : "#6b21a8"
                    }}
                  >
                    {item.status}
                  </span>
                </div>

                <h3 style={{ fontSize: "16px", margin: "4px 0 10px", color: "var(--text)" }}>
                  {item.title}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--muted)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📅</span>
                    <strong>
                      {item.eventDateRaw || formatDate(item.eventDate)}
                    </strong>
                  </div>

                  {item.eventTime && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>⏰</span>
                      <span>{item.eventTime}</span>
                    </div>
                  )}

                  {item.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>📍</span>
                      <span>{item.location}</span>
                    </div>
                  )}
                </div>

                {item.email && (
                  <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed var(--border, #eee)", fontSize: "12px" }}>
                    <span style={{ color: "var(--muted)" }}>Source Email: </span>
                    <Link to={`/inbox/${item.email._id || item.email}`} style={{ color: "var(--primary, #3b82f6)", fontWeight: 500, textDecoration: "none" }}>
                      {item.email.subject || "View email →"}
                    </Link>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px", paddingTop: "10px", borderTop: "1px solid var(--border, #f0f0f0)" }}>
                {item.status !== "Completed" && (
                  <button
                    className="button button-quiet"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => handleStatusChange(item._id, "Completed")}
                  >
                    ✓ Complete
                  </button>
                )}
                {item.status !== "Cancelled" && (
                  <button
                    className="button button-quiet"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => handleStatusChange(item._id, "Cancelled")}
                  >
                    ✕ Cancel
                  </button>
                )}
                <button
                  className="button button-quiet"
                  style={{ fontSize: "11px", padding: "4px 8px", color: "#dc2626" }}
                  onClick={() => handleDelete(item._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
        >
          <div className="message-card" style={{ maxWidth: "480px", width: "90%", padding: "24px" }}>
            <h2 style={{ margin: "0 0 16px" }}>Create Event</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Review Meeting"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border, #ccc)", borderRadius: "6px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={newEvent.eventDate}
                    onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border, #ccc)", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 2:00 PM"
                    value={newEvent.eventTime}
                    onChange={(e) => setNewEvent({ ...newEvent, eventTime: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border, #ccc)", borderRadius: "6px" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>Location</label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room A / Zoom Link"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border, #ccc)", borderRadius: "6px" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>Category</label>
                <select
                  value={newEvent.category}
                  onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border, #ccc)", borderRadius: "6px" }}
                >
                  <option value="Office/Work">Office/Work</option>
                  <option value="College/Education">College/Education</option>
                  <option value="Personal">Personal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="button button-quiet" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
