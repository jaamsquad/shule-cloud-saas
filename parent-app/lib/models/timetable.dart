/// A single lesson slot in the weekly timetable.
class Lesson {
  final String day;      // Monday..Friday
  final String subject;
  final String teacher;
  final String room;
  final String start;    // "08:00"
  final String end;      // "09:30"
  final bool isBreak;

  const Lesson({
    required this.day,
    required this.subject,
    this.teacher = '',
    this.room = '',
    this.start = '',
    this.end = '',
    this.isBreak = false,
  });

  factory Lesson.fromJson(Map<String, dynamic> j) => Lesson(
        day: (j['day'] ?? '').toString(),
        subject: (j['subject'] ?? j['name'] ?? '').toString(),
        teacher: (j['teacher'] ?? '').toString(),
        room: (j['room'] ?? '').toString(),
        start: (j['start'] ?? j['startTime'] ?? '').toString(),
        end: (j['end'] ?? j['endTime'] ?? '').toString(),
        isBreak: j['isBreak'] == true || '${j['subject'] ?? ''}'.toLowerCase().contains('break'),
      );
}
