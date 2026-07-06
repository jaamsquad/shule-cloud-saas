enum AttStatus { present, absent, late, excused, none }

AttStatus attFrom(String? s) => switch ((s ?? '').toLowerCase()) {
      'present' => AttStatus.present,
      'absent' => AttStatus.absent,
      'late' => AttStatus.late,
      'excused' => AttStatus.excused,
      _ => AttStatus.none,
    };

class AttendanceDay {
  final DateTime date;
  final AttStatus status;
  const AttendanceDay(this.date, this.status);
}

class AttendanceSummary {
  final int present, absent, late, excused;
  final double monthPercent;
  final double yearPercent;
  final List<AttendanceDay> days;
  final List<({String label, String time, String detail})> timeline;

  const AttendanceSummary({
    this.present = 0, this.absent = 0, this.late = 0, this.excused = 0,
    this.monthPercent = 0, this.yearPercent = 0,
    this.days = const [], this.timeline = const [],
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> j) {
    final rawDays = (j['days'] as List?) ?? [];
    return AttendanceSummary(
      present: _i(j['present']), absent: _i(j['absent']),
      late: _i(j['late']), excused: _i(j['excused']),
      monthPercent: _d(j['monthPercent'] ?? j['rate']),
      yearPercent: _d(j['yearPercent']),
      days: rawDays.map((e) {
        final m = Map<String, dynamic>.from(e as Map);
        return AttendanceDay(DateTime.tryParse('${m['date']}') ?? DateTime.now(), attFrom(m['status']?.toString()));
      }).toList(),
      timeline: ((j['timeline'] as List?) ?? []).map((e) {
        final m = Map<String, dynamic>.from(e as Map);
        return (label: '${m['label'] ?? ''}', time: '${m['time'] ?? ''}', detail: '${m['detail'] ?? ''}');
      }).toList(),
    );
  }

  static int _i(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
  static double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;
}
