class LessonSlot {
  final String subject;
  final String teacher;
  final String room;
  final String className;
  const LessonSlot({this.subject = '', this.teacher = '', this.room = '', this.className = ''});

  factory LessonSlot.fromJson(Map<String, dynamic> j) => LessonSlot(
        subject: (j['subject'] ?? '').toString(),
        teacher: (j['teacher'] ?? '').toString(),
        room: (j['room'] ?? '').toString(),
        className: (j['className'] ?? '').toString(),
      );

  bool get isEmpty => subject.isEmpty;
}

class TimetableGrid {
  final List<String> timeSlots;
  final Map<String, Map<String, LessonSlot>> grid; // day -> slot -> lesson
  const TimetableGrid({this.timeSlots = const [], this.grid = const {}});

  factory TimetableGrid.fromJson(Map<String, dynamic> j) {
    final slots = (j['timeSlots'] as List?)?.map((e) => e.toString()).toList() ?? const <String>[];
    final gridJson = (j['grid'] as Map?) ?? {};
    final grid = <String, Map<String, LessonSlot>>{};
    gridJson.forEach((day, bySlot) {
      final inner = <String, LessonSlot>{};
      if (bySlot is Map) {
        bySlot.forEach((slot, lesson) {
          if (lesson is Map) inner[slot.toString()] = LessonSlot.fromJson(Map<String, dynamic>.from(lesson));
        });
      }
      grid[day.toString()] = inner;
    });
    return TimetableGrid(timeSlots: slots, grid: grid);
  }
}
