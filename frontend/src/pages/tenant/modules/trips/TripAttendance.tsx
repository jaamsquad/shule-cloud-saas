import RosterAttendance from "../shared/RosterAttendance";

export default function TripAttendance() {
    return (
        <RosterAttendance
            title="Trip Attendance"
            subtitle="Travel-day register — pick a trip to load its participants, then mark each present/absent"
            activityLabel="Trip"
            activityEndpoint="/trips"
            activityNameField="name"
            participantsEndpoint="/trip-participants"
            participantActivityField="tripName"
            attendanceEndpoint="/trip-attendance"
            attendanceActivityKey="tripName"
            moduleKey="trips"
        />
    );
}
