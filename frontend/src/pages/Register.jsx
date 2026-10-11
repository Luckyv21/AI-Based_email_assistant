import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (error) setError("");
  };

  // Real-time password strength evaluation
  const passwordStrength = useMemo(() => {
    const pwd = form.password;
    if (!pwd) return { score: 0, label: "", statusClass: "" };

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd) || (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd))) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Weak (needs 8+ chars)", statusClass: "weak" };
      case 2:
        return { score: 2, label: "Fair", statusClass: "fair" };
      case 3:
        return { score: 3, label: "Good", statusClass: "good" };
      case 4:
      default:
        return { score: 4, label: "Strong", statusClass: "strong" };
    }
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (form.confirmPassword && form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    if (!agreeTerms) {
      setError("Please accept the Terms of Service to create your workspace.");
      return;
    }

    setLoading(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/gmail-connect");
    } catch (err) {
      setError(err.message || "Failed to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Brand Showcase Aside */}
      <aside className="auth-aside">
        <div className="auth-aside-header">
          <Link to="/register" className="auth-brand">
            <img src="/mailistor-logo-dark.png" alt="Mailistor" className="auth-brand-full-logo" />
          </Link>
          <span className="auth-brand-tag">Instant Setup</span>
        </div>

        <div className="auth-aside-content">
          <div className="auth-badge">
            <span className="auth-badge-dot"></span>
            Private AI Assistant Workspace
          </div>

          <h1>
            Start with a <br />
            <span className="highlight-text">clean slate</span> and zero inbox clutter.
          </h1>

          <p className="auth-aside-desc">
            Build a private command center for your high-priority messages, upcoming meetings, and automated email classification.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <h3>Smart Priority Ingestion</h3>
                <p>Never miss critical emails with automated urgent classification.</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <h3>Automated Meeting Schedule</h3>
                <p>MailEx NER extracts dates & times to synchronize your agenda.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-aside-footer">
          <div className="auth-aside-stat">
            <strong>100%</strong> private
          </div>
          <span>•</span>
          <div className="auth-aside-stat">
            <strong>30s</strong> setup
          </div>
          <span>•</span>
          <div className="auth-aside-stat">
            <strong>FastAPI</strong> powered
          </div>
        </div>
      </aside>

      {/* Right Registration Card */}
      <main className="auth-main-wrap">
        <div className="auth-card-panel">
          <div className="auth-card-header">
            <div className="auth-card-logo-wrap">
              <img src="/mailistor-logo-transparent.png" alt="Mailistor" className="auth-card-logo-img" />
            </div>
            <span className="auth-sub-eyebrow">Create Workspace</span>
            <h2>Make your account</h2>
            <p className="auth-card-subtitle">
              Set up your details to get started with Mailistor in seconds.
            </p>
          </div>

          {/* Quick Google Sign Up Option */}
          <button
            type="button"
            className="google-oauth-btn"
            onClick={signInWithGoogle}
            id="register-google-btn"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div className="auth-divider">
            <span>or register with email</span>
          </div>

          {/* Registration Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="auth-error-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Name */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-name">
                Full Name
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </span>
                <input
                  id="register-name"
                  type="text"
                  className="auth-input"
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="register-email">
                Work or Personal Email
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </span>
                <input
                  id="register-email"
                  type="email"
                  className="auth-input"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@domain.com"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck="false"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="auth-label">
                <label htmlFor="register-password">Password</label>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Min. 8 characters</span>
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input has-toggle"
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Meter */}
              {form.password && (
                <div className="password-strength-container">
                  <div className="password-strength-bars">
                    <div className={`strength-bar ${passwordStrength.score >= 1 ? `active-${passwordStrength.statusClass}` : ""}`}></div>
                    <div className={`strength-bar ${passwordStrength.score >= 2 ? `active-${passwordStrength.statusClass}` : ""}`}></div>
                    <div className={`strength-bar ${passwordStrength.score >= 3 ? `active-${passwordStrength.statusClass}` : ""}`}></div>
                    <div className={`strength-bar ${passwordStrength.score >= 4 ? `active-${passwordStrength.statusClass}` : ""}`}></div>
                  </div>
                  <div className="password-strength-label">
                    <span>Password Strength:</span>
                    <span className={`status-text ${passwordStrength.statusClass}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Terms of Service Checkbox */}
            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span>I agree to Mailistor's Terms of Service & Privacy Policy</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              id="register-submit-btn"
            >
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true"></span>
                  <span>Creating your account...</span>
                </>
              ) : (
                <span>Create Workspace</span>
              )}
            </button>
          </form>

          <div className="auth-card-footer">
            <p className="auth-switch-text">
              Already have an account?
              <Link to="/login" className="auth-switch-link">
                Sign in
              </Link>
            </p>

            <div className="auth-security-badge">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Encrypted Credentials · SOC-2 Compliant Patterns</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
