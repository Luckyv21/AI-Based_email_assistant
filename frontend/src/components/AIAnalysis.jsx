import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CategoryBadge from "./CategoryBadge";
import PriorityBadge from "./PriorityBadge";
import { analyzeEmail } from "../api/gmail";

export default function AIAnalysis({ email, onEmailUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoTriggeredRef = useRef(false);

  const hasAI =
    email.category &&
    email.category !== "Other" &&
    email.categoryConfidence > 0;

  const hasEvents = email.hasEvent && email.extractedEvents && email.extractedEvents.length > 0;

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await analyzeEmail(email._id);
      if (res?.email && onEmailUpdated) {
        onEmailUpdated(res.email);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "Failed to analyze email");
    } finally {
      setLoading(false);
    }
  };

  // Automatically trigger AI analysis on load if email hasn't been analyzed yet
  useEffect(() => {
    if (email?._id && !hasAI && !loading && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      handleAnalyze();
    }
  }, [email?._id, hasAI]);

  return (
    <section className="analysis-panel message-card" style={{ marginTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border, #eee)", paddingBottom: "10px" }}>
        <div className="section-kicker" style={{ margin: 0 }}>
          ✦ Dual-Model AI Intelligence
          {loading && <span style={{ marginLeft: "8px", fontWeight: "normal", color: "#6b21a8" }}>(Analyzing automatically...)</span>}
        </div>
        <button
          className="button button-quiet"
          onClick={handleAnalyze}
          disabled={loading}
          style={{ fontSize: "12px", padding: "4px 10px" }}
        >
          {loading ? "Analyzing..." : hasAI ? "↻ Re-analyze" : "✦ Run Analysis"}
        </button>
      </div>

      {error && <p style={{ color: "#e53e3e", fontSize: "12px", marginTop: "8px" }}>{error}</p>}

      {loading ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: "20px", marginBottom: "8px" }}>⚙️</div>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>
            Automatically running SECD Multi-Task Classifier & MailEx BiLSTM Event Extractor...
          </p>
        </div>
      ) : hasAI ? (
        <>
          <div className="analysis-grid" style={{ marginTop: "14px" }}>
            <div>
              <span>Predicted Category (SECD Classifier)</span>
              <CategoryBadge value={email.category} />
              <small>{Math.round(email.categoryConfidence * 100)}% confidence</small>
            </div>
            <div>
              <span>Detected Priority (SECD Prioritizer)</span>
              <PriorityBadge value={email.priority} />
              <small>
                {email.priorityConfidence
                  ? `${Math.round(email.priorityConfidence * 100)}% confidence`
                  : "High confidence"}
              </small>
            </div>
          </div>

          {/* Event Extraction Display */}
          <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px dashed var(--border, #eee)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text, #333)" }}>
                📅 Extracted Events & Schedules (MailEx BiLSTM)
              </span>
              {hasEvents && (
                <Link to="/events" style={{ fontSize: "12px", color: "var(--primary, #3b82f6)", textDecoration: "none" }}>
                  View in Events Calendar →
                </Link>
              )}
            </div>

            {hasEvents ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {email.extractedEvents.map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(126, 34, 206, 0.05)",
                      border: "1px solid rgba(126, 34, 206, 0.2)",
                      borderRadius: "8px",
                      padding: "12px 14px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "14px", color: "#6b21a8" }}>
                        📌 {ev.title || "Detected Event"}
                      </strong>
                      <span className="badge badge-event" style={{ fontSize: "10px" }}>
                        {Math.round((ev.confidence || 0.9) * 100)}% Confidence
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "var(--muted, #555)", marginTop: "4px" }}>
                      {ev.date && (
                        <span>
                          <strong>Date:</strong> {ev.date}
                        </span>
                      )}
                      {ev.time && (
                        <span>
                          <strong>Time:</strong> {ev.time}
                        </span>
                      )}
                      {ev.location && (
                        <span>
                          <strong>Location:</strong> {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ margin: "4px 0", fontSize: "12px" }}>
                No event or calendar commitments were detected in this email.
              </p>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <p className="muted" style={{ margin: 0, fontSize: "12px" }}>
            Awaiting automatic analysis...
          </p>
        </div>
      )}
    </section>
  );
}
