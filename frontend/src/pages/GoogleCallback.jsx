import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const user = searchParams.get("user");

    if (token && user) {
      localStorage.setItem("email_assistant_token", token);
      localStorage.setItem("email_assistant_user", user);
      localStorage.setItem("email_assistant_gmail_connected", "true");
      window.location.replace("/inbox");
    } else {
      window.location.replace("/login?error=google_authorization_failed");
    }
  }, [searchParams]);

  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><p>Signing you in…</p></div>;
}
