import { Routes, Route, Navigate } from "react-router-dom";
import ParentLogin from "./ParentLogin";
import ParentLayout from "./ParentLayout";
import ParentDashboard from "./pages/ParentDashboard";
import ParentResults from "./pages/ParentResults";
import ParentFees from "./pages/ParentFees";
import ParentTimetable from "./pages/ParentTimetable";
import ParentAttendance from "./pages/ParentAttendance";
import ParentReceipts from "./pages/ParentReceipts";
import ParentWallet from "./pages/ParentWallet";
import AnnouncementsView from "../AnnouncementsView";
import { parentApi } from "./parentApi";

export default function ParentApp() {
    return (
        <Routes>
            <Route path="/login" element={<ParentLogin />} />
            <Route element={<ParentLayout />}>
                <Route path="/" element={<ParentDashboard />} />
                <Route path="/results" element={<ParentResults />} />
                <Route path="/timetable" element={<ParentTimetable />} />
                <Route path="/attendance" element={<ParentAttendance />} />
                <Route path="/fees" element={<ParentFees />} />
                <Route path="/wallet" element={<ParentWallet />} />
                <Route path="/receipts" element={<ParentReceipts />} />
                <Route path="/announcements" element={<AnnouncementsView api={parentApi} endpoint="/parent-portal/announcements" queryKey="parent_ann" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
