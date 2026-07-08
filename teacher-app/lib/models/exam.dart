class ExamLite {
  final String id;
  final String name;
  final String term;
  final String academicYear;
  final double totalMarks;
  const ExamLite({required this.id, required this.name, this.term = '', this.academicYear = '', this.totalMarks = 100});

  factory ExamLite.fromJson(Map<String, dynamic> j) => ExamLite(
        id: (j['_id'] ?? j['id'] ?? '').toString(),
        name: (j['name'] ?? 'Exam').toString(),
        term: (j['term'] ?? '').toString(),
        academicYear: (j['academicYear'] ?? '').toString(),
        totalMarks: (j['totalMarks'] as num?)?.toDouble() ?? 100,
      );
}

/// Draft | Submitted | Approved | Locked | Returned | Rejected
class MarksStatus {
  final String status;
  final bool locked;
  const MarksStatus({this.status = 'Draft', this.locked = false});
  factory MarksStatus.fromJson(Map<String, dynamic> j) =>
      MarksStatus(status: (j['status'] ?? 'Draft').toString(), locked: j['locked'] == true);
}
