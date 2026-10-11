import { useState, useRef, useEffect } from "react";
import { sendMessage } from "../api/gmail";

const TEMPLATES = [
  {
    id: "meeting",
    label: "📅 Meeting Invite",
    subject: "Project Discussion & Review Meeting",
    body: `Hi team,

I would like to schedule a project review and sync meeting on [Date, e.g. October 25, 2026] at [Time, e.g. 3:00 PM] in [Location, e.g. Seminar Hall / Google Meet].

Agenda:
1. Review current milestones and progress
2. Demonstration of the AI email intelligence features
3. Next steps and deliverables

Please let me know if this time works for you.

Best regards,`
  },
  {
    id: "demo",
    label: "🚀 Project Demo",
    subject: "Invitation: Live Project Demonstration",
    body: `Hi everyone,

We will be conducting the live demonstration of our AI-Based Email Assistant on [Date] at [Time].

Key Highlights:
- Deep learning SECD DistilBERT email categorization & priority
- MailEx BiLSTM automated event extraction & calendar integration
- Real-time event deduplication and alert system

Looking forward to your presence and feedback!

Best regards,`
  },
  {
    id: "followup",
    label: "✉️ Polite Follow-up",
    subject: "Follow-up regarding our discussion",
    body: `Hi,

I hope you're having a productive week.

I am writing to quickly follow up on our previous conversation regarding [Topic]. Please let me know if you need any additional information or documentation from my side.

Looking forward to hearing from you.

Best regards,`
  },
  {
    id: "urgent",
    label: "⚡ Urgent Review Request",
    subject: "URGENT: Action Required on Project Review",
    body: `Dear Team,

Please review the attached project deliverables at your earliest convenience. We have an upcoming deadline and require your feedback today.

Thank you for your prompt attention to this matter.

Best regards,`
  }
];

export default function ComposeModal({ user, onClose }) {
  const [form, setForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: ""
  });

  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [windowState, setWindowState] = useState("docked"); // "docked" | "expanded" | "minimized"
  const [showAiTools, setShowAiTools] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const textareaRef = useRef(null);
  const toInputRef = useRef(null);

  useEffect(() => {
    if (windowState !== "minimized") {
      toInputRef.current?.focus();
    }
  }, [windowState]);

  const update = (key) => (e) => {
    setForm((current) => ({ ...current, [key]: e.target.value }));
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to send
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const applyTemplate = (template) => {
    setForm((current) => ({
      ...current,
      subject: current.subject || template.subject,
      body: current.body ? `${current.body}\n\n${template.body}` : template.body
    }));
    setShowAiTools(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleAiDraft = () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setTimeout(() => {
      const p = aiPrompt.toLowerCase();
      let generatedSubject = form.subject || "Project Update";
      let generatedBody = "";

      if (p.includes("meet") || p.includes("interview") || p.includes("discuss") || p.includes("schedule")) {
        generatedSubject = "Meeting Request: Discussion & Next Steps";
        generatedBody = `Hi,\n\nI would like to request a meeting regarding ${aiPrompt}. Would [Date] at [Time] suit your schedule?\n\nPlease let me know your availability.\n\nBest regards,`;
      } else if (p.includes("follow") || p.includes("status") || p.includes("check")) {
        generatedSubject = "Checking in: Status Update";
        generatedBody = `Hi,\n\nI hope all is well. I wanted to follow up on ${aiPrompt}. Please let me know if there are any updates or if you require any assistance.\n\nThanks,\nBest regards,`;
      } else if (p.includes("leave") || p.includes("vacation") || p.includes("sick")) {
        generatedSubject = "Leave Notification";
        generatedBody = `Dear Team,\n\nI am writing to notify you that I will be on leave regarding ${aiPrompt}. I will ensure all pending items are handed over before then.\n\nThank you,\nBest regards,`;
      } else {
        generatedSubject = aiPrompt.slice(0, 45);
        generatedBody = `Dear Colleague,\n\nI am writing to you regarding ${aiPrompt}.\n\nPlease review and let me know your thoughts at your convenience.\n\nBest regards,`;
      }

      setForm((current) => ({
        ...current,
        subject: current.subject || generatedSubject,
        body: generatedBody
      }));
      setAiGenerating(false);
      setAiPrompt("");
      setShowAiTools(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }, 400);
  };

  const applyFormatting = (prefix, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.body;
    const selected = text.substring(start, end) || "text";

    const replacement = `${prefix}${selected}${suffix}`;
    const newBody = text.substring(0, start) + replacement + text.substring(end);

    setForm((current) => ({ ...current, body: newBody }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!form.to.trim()) {
      setError("Please specify at least one recipient email");
      toInputRef.current?.focus();
      return;
    }
    if (!form.body.trim()) {
      setError("Please enter a message body");
      textareaRef.current?.focus();
      return;
    }

    setStatus("Sending...");
    setError("");

    try {
      await sendMessage({
        to: form.to.split(",").map((s) => s.trim()).filter(Boolean),
        cc: form.cc ? form.cc.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        bcc: form.bcc ? form.bcc.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        subject: form.subject || "(no subject)",
        body: form.body
      });

      setStatus("Message sent successfully! ✓");
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setStatus("");
      setError(err.message || "Failed to send email");
    }
  };

  const handleClose = () => {
    if (form.body.trim().length > 30) {
      if (!window.confirm("Discard draft? Your unsaved text will be lost.")) {
        return;
      }
    }
    onClose();
  };

  // Minimized Window View
  if (windowState === "minimized") {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: "24px",
          width: "320px",
          height: "44px",
          background: "#1f2937",
          color: "#ffffff",
          borderRadius: "8px 8px 0 0",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          zIndex: 1200,
          cursor: "pointer"
        }}
        onClick={() => setWindowState("docked")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span>✉️</span>
          <span>{form.subject || "New Message (Draft)"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            title="Expand"
            onClick={(e) => {
              e.stopPropagation();
              setWindowState("docked");
            }}
            style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "0.9rem" }}
          >
            ▲
          </button>
          <button
            type="button"
            title="Close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "1rem" }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Expanded View or Docked View
  const isExpanded = windowState === "expanded";

  return (
    <>
      {isExpanded && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(2px)",
            zIndex: 1199
          }}
          onClick={handleClose}
        />
      )}

      <div
        style={{
          position: "fixed",
          ...(isExpanded
            ? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "820px",
                maxWidth: "94vw",
                height: "82vh",
                maxHeight: "840px",
                borderRadius: "12px"
              }
            : {
                bottom: 0,
                right: "24px",
                width: "580px",
                maxWidth: "calc(100vw - 32px)",
                height: "560px",
                maxHeight: "calc(100vh - 80px)",
                borderRadius: "12px 12px 0 0"
              }),
          background: "var(--color-surface, #ffffff)",
          color: "var(--color-text, #1e293b)",
          boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.28), 0 4px 12px rgba(0, 0, 0, 0.15)",
          border: "1px solid var(--color-border, #cbd5e1)",
          display: "flex",
          flexDirection: "column",
          zIndex: 1200,
          overflow: "hidden"
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header Bar */}
        <div
          style={{
            background: "#1e293b",
            color: "#ffffff",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            userSelect: "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "0.92rem" }}>
            <span>✉️</span>
            <span>{form.subject ? form.subject.slice(0, 45) : "New Message"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              title="Minimize"
              onClick={() => setWindowState("minimized")}
              style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "1.1rem", padding: "0 4px" }}
            >
              −
            </button>
            <button
              type="button"
              title={isExpanded ? "Collapse to Dock" : "Maximize / Fullscreen"}
              onClick={() => setWindowState(isExpanded ? "docked" : "expanded")}
              style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "0.9rem", padding: "0 4px" }}
            >
              {isExpanded ? "🗗" : "⤢"}
            </button>
            <button
              type="button"
              title="Close Draft"
              onClick={handleClose}
              style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "1rem", padding: "0 4px" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {/* Recipient To: */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderBottom: "1px solid var(--color-border, #f1f5f9)",
              gap: "10px"
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)", minWidth: "40px" }}>To:</span>
            <input
              ref={toInputRef}
              type="text"
              value={form.to}
              onChange={update("to")}
              placeholder="recipients@example.com (comma separated)"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.92rem",
                color: "inherit"
              }}
            />
            <div style={{ display: "flex", gap: "8px", fontSize: "0.8rem" }}>
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600" }}
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "600" }}
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* Optional Cc: */}
          {showCc && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                borderBottom: "1px solid var(--color-border, #f1f5f9)",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)", minWidth: "40px" }}>Cc:</span>
              <input
                type="text"
                value={form.cc}
                onChange={update("cc")}
                placeholder="cc@example.com"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.92rem",
                  color: "inherit"
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setShowCc(false);
                  setForm((c) => ({ ...c, cc: "" }));
                }}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Optional Bcc: */}
          {showBcc && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                borderBottom: "1px solid var(--color-border, #f1f5f9)",
                gap: "10px"
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)", minWidth: "40px" }}>Bcc:</span>
              <input
                type="text"
                value={form.bcc}
                onChange={update("bcc")}
                placeholder="bcc@example.com"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.92rem",
                  color: "inherit"
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setShowBcc(false);
                  setForm((c) => ({ ...c, bcc: "" }));
                }}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Subject Field */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderBottom: "1px solid var(--color-border, #f1f5f9)",
              gap: "10px"
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)", minWidth: "40px" }}>Subject:</span>
            <input
              type="text"
              value={form.subject}
              onChange={update("subject")}
              placeholder="Subject topic"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.95rem",
                fontWeight: "600",
                color: "inherit"
              }}
            />

            <button
              type="button"
              onClick={() => setShowAiTools(!showAiTools)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: showAiTools ? "#8b5cf6" : "rgba(139, 92, 246, 0.12)",
                color: showAiTools ? "#ffffff" : "#7c3aed",
                border: "none",
                borderRadius: "14px",
                padding: "4px 10px",
                fontSize: "0.78rem",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <span>✨</span>
              <span>AI Assist</span>
            </button>
          </div>

          {/* AI Assistance Toolbar Panel */}
          {showAiTools && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)",
                borderBottom: "1px solid rgba(139, 92, 246, 0.2)",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAiDraft())}
                  placeholder="Tell AI what to write (e.g., 'Project demonstration on Oct 25 at 3 PM')"
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem"
                  }}
                />
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  style={{
                    background: "#7c3aed",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {aiGenerating ? "Generating..." : "Generate Draft"}
                </button>
              </div>

              {/* Quick Template Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "#6b21a8", fontWeight: "700" }}>Quick Templates:</span>
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #d8b4fe",
                      color: "#6b21a8",
                      borderRadius: "14px",
                      padding: "2px 10px",
                      fontSize: "0.75rem",
                      cursor: "pointer"
                    }}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Message Textarea */}
          <div style={{ flex: 1, position: "relative", display: "flex" }}>
            <textarea
              ref={textareaRef}
              value={form.body}
              onChange={update("body")}
              placeholder="Write your email here... Tip: mentions of meetings, dates, and times will automatically trigger the AI calendar extractor!"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                padding: "16px",
                resize: "none",
                fontFamily: "inherit",
                fontSize: "0.95rem",
                lineHeight: "1.6",
                color: "inherit",
                background: "transparent"
              }}
            />
          </div>

          {/* Notification Messages */}
          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "6px 16px", fontSize: "0.85rem", borderTop: "1px solid #fecaca" }}>
              ✕ {error}
            </div>
          )}
          {status && (
            <div style={{ background: "#dcfce7", color: "#166534", padding: "6px 16px", fontSize: "0.85rem", borderTop: "1px solid #bbf7d0" }}>
              {status}
            </div>
          )}

          {/* Bottom Action Footer */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--color-border, #f1f5f9)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.02)"
            }}
          >
            {/* Formatting Tools */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                title="Bold"
                onClick={() => applyFormatting("**", "**")}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: "bold", padding: "4px 8px", borderRadius: "4px", color: "var(--muted, #64748b)" }}
              >
                B
              </button>
              <button
                type="button"
                title="Italic"
                onClick={() => applyFormatting("*", "*")}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontStyle: "italic", padding: "4px 8px", borderRadius: "4px", color: "var(--muted, #64748b)" }}
              >
                I
              </button>
              <button
                type="button"
                title="Bullet list"
                onClick={() => applyFormatting("\n- ")}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "4px", color: "var(--muted, #64748b)" }}
              >
                •
              </button>
              <button
                type="button"
                title="Quote"
                onClick={() => applyFormatting("\n> ")}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "4px", color: "var(--muted, #64748b)" }}
              >
                ❝
              </button>
            </div>

            {/* Send & Discard Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--muted, #94a3b8)" }}>
                Ctrl + Enter to send
              </span>

              <button
                type="button"
                title="Discard draft"
                onClick={handleClose}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "6px 10px", fontSize: "1rem" }}
              >
                🗑
              </button>

              <button
                type="submit"
                className="button"
                disabled={status === "Sending..."}
                style={{
                  background: "#1a73e8",
                  color: "#ffffff",
                  padding: "8px 20px",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <span>{status === "Sending..." ? "⏳" : "➤"}</span>
                <span>{status === "Sending..." ? "Sending..." : "Send"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
