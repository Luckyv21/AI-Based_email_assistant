import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GoogleCallback from "./pages/GoogleCallback";
import GmailOnboarding from "./pages/GmailOnboarding";
import Inbox from "./pages/Inbox";
import CategoryPage from "./pages/CategoryPage";
import Important from "./pages/Important";
import Starred from "./pages/Starred";
import Events from "./pages/Events";
import EmailDetail from "./pages/EmailDetail";
import Account from "./pages/Account";
import { useAuth } from "./context/AuthContext";

function Private({ children }) { return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>; }
export default function App() {
  const { isAuthenticated } = useAuth();
  return <Routes>
    <Route path="/login" element={isAuthenticated ? <Navigate to="/inbox" replace /> : <Login />} />
    <Route path="/register" element={isAuthenticated ? <Navigate to="/inbox" replace /> : <Register />} />
    <Route path="/auth/google/callback" element={<GoogleCallback />} />
    <Route path="/account" element={<Private><Account /></Private>} />
    <Route path="/gmail-connect" element={<Private><GmailOnboarding /></Private>} />
    <Route path="/inbox" element={<Private><Inbox /></Private>} />
    <Route path="/inbox/:id" element={<Private><EmailDetail /></Private>} />
    <Route path="/education" element={<Private><CategoryPage category="Education" /></Private>} />
    <Route path="/office" element={<Private><CategoryPage category="Office" /></Private>} />
    <Route path="/personal" element={<Private><CategoryPage category="Personal" /></Private>} />
    <Route path="/important" element={<Private><Important /></Private>} />
    <Route path="/starred" element={<Private><Starred /></Private>} />
    <Route path="/events" element={<Private><Events /></Private>} />
    <Route path="/sent" element={<Private><Inbox folder="sent" title="Sent" /></Private>} />
    <Route path="/drafts" element={<Private><Inbox folder="draft" title="Drafts" /></Private>} />
    <Route path="/trash" element={<Private><Inbox folder="trash" title="Trash" /></Private>} />
    <Route path="/spam" element={<Private><Inbox folder="spam" title="Spam" /></Private>} />
    <Route path="*" element={<Navigate to={isAuthenticated ? "/inbox" : "/login"} replace />} />
  </Routes>;
}
