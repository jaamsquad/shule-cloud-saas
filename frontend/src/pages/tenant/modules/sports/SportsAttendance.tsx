import RosterAttendance from "../shared/RosterAttendance";

export default function SportsAttendance() {
    return (
        <RosterAttendance
            title="Sports Attendance"
            subtitle="Session register — pick a sport to load its participants, then mark each present/absent"
            activityLabel="Sport"
            activityEndpoint="/sports"
            activityNameField="name"
            participantsEndpoint="/sports-enrollments"
            participantActivityField="sportName"
            attendanceEndpoint="/sports-attendance"
            attendanceActivityKey="sportName"
            moduleKey="sports"
        />
    );
}
