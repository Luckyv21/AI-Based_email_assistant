import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import ComposeModal from "./ComposeModal";
export default function Layout({ children }) { const [menuOpen, setMenuOpen] = useState(false); const [compose, setCompose] = useState(false); const { user } = useAuth(); return <div className="app-shell"><Topbar onMenu={() => setMenuOpen(true)} onCompose={() => setCompose(true)} /><div className="app-body"><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onCompose={() => setCompose(true)} /><main className="main-content"><div className="content-wrap">{children}</div></main></div>{compose && <ComposeModal user={user} onClose={() => setCompose(false)} />}</div>; }
