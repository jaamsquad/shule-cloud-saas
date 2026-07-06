/// A single term assessment (CAT / Mid-Term / End-Term / CBC).
class Assessment {
  final String name;
  final String date;
  final int score;
  final int outOf;
  final String grade;
  final String status;
  const Assessment({required this.name, this.date = '', this.score = 0, this.outOf = 100, this.grade = '', this.status = ''});

  factory Assessment.fromJson(Map<String, dynamic> j) => Assessment(
        name: (j['name'] ?? j['type'] ?? 'Assessment').toString(),
        date: (j['date'] ?? j['completedOn'] ?? '').toString(),
        score: _i(j['score'] ?? j['marks']),
        outOf: _i(j['outOf'] ?? j['totalMarks'] ?? 100),
        grade: (j['grade'] ?? '').toString(),
        status: (j['status'] ?? '').toString(),
      );
  static int _i(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
}

/// Per-subject average for the results screen.
class SubjectAverage {
  final String subject;
  final double percent;
  const SubjectAverage(this.subject, this.percent);
  factory SubjectAverage.fromJson(Map<String, dynamic> j) => SubjectAverage(
        (j['subject'] ?? j['name'] ?? '').toString(),
        (j['percent'] is num ? (j['percent'] as num).toDouble() : double.tryParse('${j['percent'] ?? ''}') ?? 0),
      );
}

/// The academic results summary for the selected student.
class ResultsSummary {
  final String overallGrade;
  final int classRank;
  final double changeVsLastTerm;
  final String? teacherComment;
  final List<Assessment> assessments;
  final List<SubjectAverage> subjects;

  const ResultsSummary({
    this.overallGrade = '-',
    this.classRank = 0,
    this.changeVsLastTerm = 0,
    this.teacherComment,
    this.assessments = const [],
    this.subjects = const [],
  });

  factory ResultsSummary.fromJson(Map<String, dynamic> j) => ResultsSummary(
        overallGrade: (j['overallGrade'] ?? j['grade'] ?? '-').toString(),
        classRank: (j['classRank'] is num) ? (j['classRank'] as num).toInt() : 0,
        changeVsLastTerm: (j['change'] is num) ? (j['change'] as num).toDouble() : 0,
        teacherComment: j['teacherComment']?.toString(),
        assessments: ((j['assessments'] as List?) ?? []).map((e) => Assessment.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
        subjects: ((j['subjects'] as List?) ?? []).map((e) => SubjectAverage.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      );
}
