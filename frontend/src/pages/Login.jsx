import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem("mailistor_remembered_email") || localStorage.getItem("aura_remembered_email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem("mailistor_remembered_email") || localStorage.getItem("aura_remembered_email")));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Fallback to DOM input values in case browser autofill did not trigger React's synthetic onChange
    const formEl = e.currentTarget;
    const emailVal = email || formEl.querySelector("input[type='email']")?.value || "";
    const passVal = password || formEl.querySelector("input[type='password']")?.value || "";

    if (!emailVal.trim() || !passVal) {
      setError("Please fill in both email and password.");
      setLoading(false);
      return;
    }

    try {
      await login({ email: emailVal.trim(), password: passVal });
      if (rememberMe) {
        localStorage.setItem("mailistor_remembered_email", emailVal.trim());
      } else {
        localStorage.removeItem("mailistor_remembered_email");
        localStorage.removeItem("aura_remembered_email");
      }
      navigate(location.state?.from?.pathname || "/inbox");
    } catch (err) {
      setError(err.message || "Invalid email or password. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    alert("To reset your password or access your workspace, please sign in using Google OAuth or contact your system administrator.");
  };

  return (
    <div className="auth-page">
      {/* Left Brand & Feature Showcase */}
      <aside className="auth-aside">
        <div className="auth-aside-header">
          <Link to="/login" className="auth-brand">
            <img src="/mailistor-logo-dark.png" alt="Mailistor" className="auth-brand-full-logo" />
          </Link>
          <span className="auth-brand-tag">v2.0 Neural</span>
        </div>

        <div className="auth-aside-content">
          <div className="auth-badge">
            <span className="auth-badge-dot"></span>
            Dual-Model Deep Learning Engine
          </div>

          <h1>
            Your inbox, <br />
            <span className="highlight-text">calmly organized</span> by AI.
          </h1>

          <p className="auth-aside-desc">
            Connect your Gmail to experience neural email categorization, priority detection, and automated event extraction in one unified workspace.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <h3>SECD Multi-Task Neural Engine</h3>
                <p>Categorizes Office, Education, & Personal with urgent triage.</p>
              </div>
            </div>

            <div className="auth-feature-card">
              <div className="auth-feature-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <h3>MailEx BiLSTM Event Extractor</h3>
                <p>Detects meeting dates, times, and agendas automatically.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-aside-footer">
          <div className="auth-aside-stat">
            <strong>&lt;100ms</strong> inference
          </div>
          <span>•</span>
          <div className="auth-aside-stat">
            <strong>OAuth 2.0</strong> verified
          </div>
          <span>•</span>
          <div className="auth-aside-stat">
            <strong>256-Bit</strong> encrypted
          </div>
        </div>
      </aside>

      {/* Right Login Form */}
      <main className="auth-main-wrap">
        <div className="auth-card-panel">
          <div className="auth-card-header">
            <div className="auth-card-logo-wrap">
              <img src="/mailistor-logo-transparent.png" alt="Mailistor" className="auth-card-logo-img" />
            </div>
            <span className="auth-sub-eyebrow">Welcome Back</span>
            <h2>Sign in to Mailistor</h2>
            <p className="auth-card-subtitle">
              Enter your credentials to access your intelligent inbox.
            </p>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            className="google-oauth-btn"
            onClick={signInWithGoogle}
            id="google-signin-btn"
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
            <span>Continue with Google</span>
          </button>

          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

          {/* Form */}
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

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">
                Email Address
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
                  id="login-email"
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck="false"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-label">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
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
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input has-toggle"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </div>

            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in to Workspace</span>
              )}
            </button>
          </form>

          <div className="auth-card-footer">
            <p className="auth-switch-text">
              Don't have an account yet?
              <Link to="/register" className="auth-switch-link">
                Create an account
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
              <span>TLS 256-Bit Encrypted Session</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
