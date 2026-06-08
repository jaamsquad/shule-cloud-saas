import { Settings2, Radio, Users, Briefcase, Megaphone, FileText, ShieldAlert, BarChart3, LayoutTemplate } from "lucide-react";
import SettingsBuilder, { SBSection, toggles } from "./SettingsBuilder";

const SECTIONS: SBSection[] = [
    { title: "General Settings", icon: Settings2, fields: toggles([
        ["enableParentComm", "Enable Parent Communication"], ["enableStaffComm", "Enable Staff Communication"],
        ["enableStudentComm", "Enable Student Communication"], ["enableGroupMessaging", "Enable Group Messaging"],
        ["enableBroadcast", "Enable Broadcast Messages"], ["enableAnnouncements", "Enable Announcements"],
        ["enableReplies", "Enable Message Replies"], ["enableReadReceipts", "Enable Read Receipts"],
    ]) },
    { title: "Notification Channels", icon: Radio, fields: toggles([
        ["chWhatsApp", "WhatsApp Notifications"], ["chEmail", "Email Notifications"], ["chSMS", "SMS Notifications"],
        ["chPush", "Mobile App Push Notifications"], ["chInSystem", "In-System Notifications"],
    ]) },
    { title: "Parent Communication", icon: Users, fields: toggles([
        ["pMsgIndividual", "Message Individual Parent"], ["pMsgMultiple", "Message Multiple Parents"],
        ["pMsgAll", "Message All Parents"], ["pMsgByClass", "Message Parents by Class"],
        ["pMsgByStream", "Message Parents by Stream"], ["pMsgByGrade", "Message Parents by Grade"],
        ["pMsgFeeBalances", "Message Parents with Fee Balances"], ["pMsgAbsent", "Message Parents of Absent Students"],
    ]) },
    { title: "Parent Notifications", icon: Users, fields: toggles([
        ["pnAttendance", "Attendance Alerts"], ["pnFeeBalance", "Fee Balance Alerts"], ["pnFeePayment", "Fee Payment Confirmations"],
        ["pnExams", "Examination Notifications"], ["pnReportCard", "Report Card Notifications"], ["pnEvents", "School Event Notifications"],
        ["pnDiscipline", "Discipline Notifications"], ["pnHomework", "Homework Notifications"],
        ["pnClosure", "School Closure Notifications"], ["pnEmergency", "Emergency Alerts"],
    ]) },
    { title: "Staff Communication", icon: Briefcase, fields: toggles([
        ["sMsgIndividual", "Message Individual Staff Member"], ["sMsgDepartment", "Message Department"],
        ["sMsgTeachers", "Message All Teachers"], ["sMsgAll", "Message All Staff"],
        ["sInternalChat", "Internal Staff Chat"], ["sGroupDiscussions", "Group Discussions"],
    ]) },
    { title: "Staff Notifications", icon: Briefcase, fields: toggles([
        ["snMeetings", "Meeting Notifications"], ["snTimetable", "Timetable Changes"], ["snExamSchedule", "Exam Scheduling Notifications"],
        ["snPayroll", "Payroll Notifications"], ["snLeave", "Leave Approval Notifications"], ["snEvents", "School Event Notifications"],
        ["snEmergency", "Emergency Announcements"],
    ]) },
    { title: "Announcement Categories", icon: Megaphone, fields: toggles([
        ["acAcademic", "Academic Announcements"], ["acExams", "Examination Announcements"], ["acFees", "Fee Announcements"],
        ["acSports", "Sports Announcements"], ["acEvents", "Event Announcements"], ["acEmergency", "Emergency Announcements"],
        ["acGeneral", "General Notices"],
    ]) },
    { title: "Message Features", icon: FileText, fields: toggles([
        ["mfRichText", "Rich Text Messages"], ["mfFiles", "File Attachments"], ["mfPdf", "PDF Attachments"],
        ["mfImages", "Image Attachments"], ["mfVoice", "Voice Notes"], ["mfVideo", "Video Attachments"],
        ["mfScheduling", "Message Scheduling"], ["mfDrafts", "Draft Messages"],
    ]) },
    { title: "Emergency Communication", icon: ShieldAlert, fields: toggles([
        ["ecAlerts", "Emergency Alerts"], ["ecClosure", "School Closure Alerts"], ["ecSecurity", "Security Alerts"],
        ["ecHealth", "Health Alerts"], ["ecWeather", "Weather Alerts"], ["ecTransport", "Transport Alerts"],
        ["ecChWhatsApp", "Emergency via WhatsApp"], ["ecChSMS", "Emergency via SMS"],
        ["ecChEmail", "Emergency via Email"], ["ecChPush", "Emergency via Push / Portal"],
    ]) },
    { title: "Tracking & Reports", icon: BarChart3, fields: toggles([
        ["trkSent", "Sent Status"], ["trkDelivered", "Delivered Status"], ["trkRead", "Read Status"],
        ["trkFailed", "Failed Status"], ["trkRetry", "Retry Failed Messages"], ["trkHistory", "Message History"],
    ]) },
    { title: "Communication Templates", icon: LayoutTemplate, fields: [
        { k: "tplAttendanceAlert", label: "Attendance Alert", type: "textarea" },
        { k: "tplFeeReminder", label: "Fee Reminder", type: "textarea" },
        { k: "tplExamNotification", label: "Exam Notification", type: "textarea" },
        { k: "tplReportCard", label: "Report Card Notification", type: "textarea" },
        { k: "tplEventInvitation", label: "Event Invitation", type: "textarea" },
        { k: "tplMeetingReminder", label: "Staff Meeting Reminder", type: "textarea" },
        { k: "tplTimetableChange", label: "Timetable Change", type: "textarea" },
        { k: "tplLeaveApproval", label: "Leave Approval", type: "textarea" },
    ] },
];

const DEFAULTS = {
    enableParentComm: true, enableStaffComm: true, enableAnnouncements: true,
    chWhatsApp: true, chEmail: true, chSMS: true, chInSystem: true,
};

export default function CommunicationPreferences() {
    return (
        <SettingsBuilder
            title="Communication Settings"
            subtitle="Master controls for parent, staff and announcement communication"
            icon={Settings2}
            collection="communication_prefs"
            sections={SECTIONS}
            defaults={DEFAULTS}
        />
    );
}
