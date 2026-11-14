import { Routes, Route, Navigate } from "react-router-dom";
import ToMainLogin from "../ToMainLogin";
import ParentLayout from "./ParentLayout";
import ParentDashboard from "./pages/ParentDashboard";
import ParentResults from "./pages/ParentResults";
import ParentAnalytics from "./pages/ParentAnalytics";
import ParentInbox from "./pages/ParentInbox";
import ParentFees from "./pages/ParentFees";
import ParentTimetable from "./pages/ParentTimetable";
import ParentAttendance from "./pages/ParentAttendance";
import ParentReceipts from "./pages/ParentReceipts";
import ParentWallet from "./pages/ParentWallet";
import ParentTrips from "./pages/ParentTrips";
import ParentSports from "./pages/ParentSports";
import AnnouncementsView from "../AnnouncementsView";
import { parentApi } from "./parentApi";

export default function ParentApp() {
    return (
        <Routes>
            <Route path="/login" element={<ToMainLogin tokenKey="parent_token" />} />
            <Route element={<ParentLayout />}>
                <Route path="/" element={<ParentDashboard />} />
                <Route path="/results" element={<ParentResults />} />
                <Route path="/analytics" element={<ParentAnalytics />} />
                <Route path="/inbox" element={<ParentInbox />} />
                <Route path="/timetable" element={<ParentTimetable />} />
                <Route path="/attendance" element={<ParentAttendance />} />
                <Route path="/fees" element={<ParentFees />} />
                <Route path="/wallet" element={<ParentWallet />} />
                <Route path="/receipts" element={<ParentReceipts />} />
                <Route path="/trips" element={<ParentTrips />} />
                <Route path="/sports" element={<ParentSports />} />
                <Route path="/announcements" element={<AnnouncementsView api={parentApi} endpoint="/parent-portal/announcements" queryKey="parent_ann" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
