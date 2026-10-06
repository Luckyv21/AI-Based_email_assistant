import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute({ children }) { const { isAuthenticated } = useAuth(); const location = useLocation(); return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />; }
