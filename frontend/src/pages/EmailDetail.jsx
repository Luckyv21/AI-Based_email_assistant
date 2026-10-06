import { useParams } from "react-router-dom";
import EmailViewer from "../components/EmailViewer";
export default function EmailDetail() { useParams(); return <EmailViewer />; }
