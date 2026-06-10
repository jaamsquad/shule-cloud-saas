import { Routes, Route, Navigate } from "react-router-dom";
import StudentLogin from "./StudentLogin";
import StudentLayout from "./StudentLayout";
import PersonalProfile from "./pages/PersonalProfile";
import Registration from "./pages/Registration";
import ExamResults from "./pages/ExamResults";
import StudentLive from "./pages/StudentLive";
import StudentTasks from "./pages/StudentTasks";
import PrintTimetable from "./pages/PrintTimetable";
import LiveRoom from "../../pages/tenant/modules/LiveRoom";
import AcademicRequisition from "./pages/AcademicRequisition";
import ClearanceRequest from "./pages/ClearanceRequest";
import FeeStructure from "./pages/FeeStructure";
import PayFees from "./pages/PayFees";
import Wallet from "./pages/Wallet";
import Receipts from "./pages/Receipts";

export default function StudentApp() {
    return (
        <Routes>
            <Route path="/login" element={<StudentLogin />} />
            <Route path="/live/:meetingId" element={<LiveRoom />} />

            <Route element={<StudentLayout />}>
                <Route path="/" element={<PersonalProfile />} />
                <Route path="/profile" element={<PersonalProfile />} />
                <Route path="/registration" element={<Registration />} />
                <Route path="/exam-results" element={<ExamResults />} />
                <Route path="/live" element={<StudentLive />} />
                <Route path="/assignments" element={<StudentTasks type="assignment" title="Assignments" />} />
                <Route path="/homework" element={<StudentTasks type="homework" title="Homework" />} />
                <Route path="/timetable" element={<PrintTimetable />} />
                <Route path="/requisition" element={<AcademicRequisition />} />
                <Route path="/clearance" element={<ClearanceRequest />} />
                <Route path="/fees/structure" element={<FeeStructure />} />
                <Route path="/fees/pay" element={<PayFees />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/receipts" element={<Receipts />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
