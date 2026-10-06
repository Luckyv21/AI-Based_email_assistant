import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as gmail from "../api/gmail";

const EmailContext = createContext(null);
export function EmailProvider({ children }) {
  const [emails, setEmails] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const clear = () => { setEmails([]); setPagination({ page: 1, limit: 20, total: 0, pages: 0 }); setError(""); }; window.addEventListener("auth:logged-out", clear); return () => window.removeEventListener("auth:logged-out", clear); }, []);
  const loadEmails = useCallback(async (params = {}) => { setLoading(true); setError(""); try { const data = await gmail.getMessages(params); setEmails(data.messages || []); setPagination(data.pagination || {}); return data; } catch (e) { setError(e.message); throw e; } finally { setLoading(false); } }, []);
  const sync = async (query) => {
    setLoading(true);
    try {
      return await gmail.syncGmail(query);
    } finally {
      setLoading(false);
    }
  };
  const clearError = () => setError("");
  const patchEmail = (updated) => setEmails((current) => current.map((email) => email._id === updated._id ? updated : email));
  const markRead = async (email) => patchEmail((await gmail.updateRead(email._id, !email.isRead)).email);
  const toggleStar = async (email) => patchEmail((await gmail.updateStar(email._id, !email.isStarred)).email);
  return <EmailContext.Provider value={{ emails, pagination, loading, error, clearError, loadEmails, sync, markRead, toggleStar }}>{children}</EmailContext.Provider>;
}
export const useEmails = () => useContext(EmailContext);
