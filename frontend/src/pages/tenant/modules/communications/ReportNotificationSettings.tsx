import { Bell, Radio, FileText, MessageCircle, Mail, MessageSquare, Users, Clock, LayoutTemplate, Activity } from "lucide-react";
import SettingsBuilder, { SBSection, toggles } from "./SettingsBuilder";

const SECTIONS: SBSection[] = [
    { title: "Notification Channels", icon: Radio, fields: toggles([
        ["chWhatsApp", "WhatsApp Notifications"], ["chSMS", "SMS Notifications"],
        ["chEmail", "Email Notifications"], ["chPush", "Mobile App Push Notifications"],
    ]) },
    { title: "Report Card Notifications", icon: FileText, fields: toggles([
        ["autoSendAfterPublish", "Send Report Card Automatically After Publishing"],
        ["manualSend", "Manual Report Card Sending"],
        ["sendPdfAttachment", "Send PDF Report Card Attachment"],
        ["sendSummaryOnly", "Send Result Summary Only"],
        ["sendFullTranscript", "Send Full Academic Transcript"],
    ]) },
    { title: "WhatsApp Notifications", icon: MessageCircle, fields: toggles([
        ["waExamResults", "Send Exam Results via WhatsApp"],
        ["waReportCardPdf", "Send Report Card PDF via WhatsApp"],
        ["waAttendance", "Send Attendance Summary via WhatsApp"],
        ["waFeeBalance", "Send Fee Balance via WhatsApp"],
        ["waTeacherComments", "Send Teacher Comments via WhatsApp"],
        ["waPromotion", "Send Promotion / Progression Status via WhatsApp"],
    ]) },
    { title: "Email Notifications", icon: Mail, fields: toggles([
        ["emReportCardPdf", "Send Report Card PDF via Email"],
        ["emExamResults", "Send Exam Results via Email"],
        ["emPerformance", "Send Academic Performance Analysis"],
        ["emAttendance", "Send Attendance Reports"],
        ["emFeeStatements", "Send Fee Statements"],
        ["emAnnouncements", "Send School Announcements"],
    ]) },
    { title: "SMS Notifications", icon: MessageSquare, fields: toggles([
        ["smsResultSummary", "Send Result Summary via SMS"],
        ["smsAttendance", "Send Attendance Alerts"],
        ["smsFeeBalance", "Send Fee Balance Alerts"],
        ["smsEmergency", "Send Emergency Notifications"],
        ["smsClosure", "Send School Closure Notifications"],
    ]) },
    { title: "Recipient Settings", icon: Users, fields: toggles([
        ["recFather", "Send to Father"], ["recMother", "Send to Mother"],
        ["recGuardian", "Send to Guardian"], ["recAllParents", "Send to All Linked Parents"],
        ["recStudent", "Send to Student"], ["recSponsor", "Send to Sponsor"],
    ]) },
    { title: "Scheduling Settings", icon: Clock, fields: [
        { k: "sendImmediately", label: "Send Immediately After Publication", type: "toggle" },
        { k: "scheduledDate", label: "Scheduled Delivery Date", type: "date" },
        { k: "scheduledTime", label: "Scheduled Delivery Time", type: "time" },
        { k: "reminderNotifications", label: "Reminder Notifications", type: "toggle" },
        { k: "resendFailed", label: "Resend Failed Notifications", type: "toggle" },
    ] },
    { title: "Delivery Tracking", icon: Activity, fields: [
        ...toggles([
            ["trackStatus", "Notification Status"], ["trackDelivered", "Delivered Status"],
            ["trackRead", "Read Status (WhatsApp)"], ["trackEmailOpen", "Email Open Status"],
            ["trackFailed", "Track Failed Deliveries"],
        ]),
        { k: "retryAttempts", label: "Retry Attempts", type: "number" },
    ] },
    { title: "Notification Templates", icon: LayoutTemplate, fields: [
        { k: "tplReportCard", label: "Report Card Template", type: "textarea" },
        { k: "tplExamResults", label: "Exam Results Template", type: "textarea" },
        { k: "tplAttendance", label: "Attendance Template", type: "textarea" },
        { k: "tplFeeBalance", label: "Fee Balance Template", type: "textarea" },
        { k: "tplAnnouncement", label: "School Announcement Template", type: "textarea" },
    ] },
];

const DEFAULTS = {
    sendImmediately: true, retryAttempts: 3,
    tplReportCard: "Dear Parent,\n{{studentName}}'s {{term}} Report Card has been released.\nAverage Score: {{average}}%\nPosition: {{position}}\nGrade: {{grade}}\nPlease log in to the Parent Portal to view the full report card.",
    tplExamResults: "Dear Parent, {{studentName}} scored an average of {{average}}% in {{examName}}. Log in to the portal for details.",
};

export default function ReportNotificationSettings() {
    return (
        <SettingsBuilder
            title="Report Notification Settings"
            subtitle="Control how report cards and results are delivered to parents"
            icon={Bell}
            collection="notification_settings"
            sections={SECTIONS}
            defaults={DEFAULTS}
            extra={
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-black text-slate-700 mb-3">Examples</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">WhatsApp Message</p>
                            <p className="text-xs text-slate-600 whitespace-pre-line">{"Dear Parent,\nAhmed Ali's Term 2 Report Card has been released.\nAverage Score: 78%\nPosition: 5/120\nGrade: B+\nPlease log in to the Parent Portal to view the full report card."}</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                            <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Email Subject</p>
                            <p className="text-sm font-bold text-slate-700">Term 2 Academic Report Card – Ahmed Ali</p>
                        </div>
                    </div>
                </div>
            }
        />
    );
}
