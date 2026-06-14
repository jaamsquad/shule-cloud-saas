import { Routes, Route, Navigate } from "react-router-dom";
import StaffLogin from "./StaffLogin";
import StaffLayout from "./StaffLayout";
import StaffDashboard from "./pages/StaffDashboard";
import MyClasses from "./pages/MyClasses";
import StaffTimetable from "./pages/StaffTimetable";
import StaffMarksEntry from "./pages/StaffMarksEntry";
import StaffResults from "./pages/StaffResults";
import StaffAttendance from "./pages/StaffAttendance";
import StaffMyAttendance from "./pages/StaffMyAttendance";
import StaffLive from "./pages/StaffLive";
import StaffContent from "./pages/StaffContent";
import StaffResources from "./pages/StaffResources";
import AnnouncementsView from "../AnnouncementsView";
import LiveRoom from "../../pages/tenant/modules/LiveRoom";
import { staffApi } from "./staffApi";

export default function StaffApp() {
    return (
        <Routes>
            <Route path="/login" element={<StaffLogin />} />
            <Route path="/live/:meetingId" element={<LiveRoom />} />
            <Route element={<StaffLayout />}>
                <Route path="/" element={<StaffDashboard />} />
                <Route path="/my-attendance" element={<StaffMyAttendance />} />
                <Route path="/classes" element={<MyClasses />} />
                <Route path="/timetable" element={<StaffTimetable />} />
                <Route path="/marks" element={<StaffMarksEntry />} />
                <Route path="/results" element={<StaffResults />} />
                <Route path="/attendance" element={<StaffAttendance />} />
                <Route path="/live" element={<StaffLive />} />
                <Route path="/lesson-plans" element={<StaffContent type="lesson-plans" />} />
                <Route path="/schemes" element={<StaffContent type="schemes" />} />
                <Route path="/resources" element={<StaffContent type="resources" />} />
                <Route path="/shared-resources" element={<StaffResources />} />
                <Route path="/assignments" element={<StaffContent type="assignments" />} />
                <Route path="/homework" element={<StaffContent type="homework" />} />
                <Route path="/announcements" element={<AnnouncementsView api={staffApi} endpoint="/staff-portal/announcements" queryKey="staff_ann" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
