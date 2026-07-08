/// A generic content item — lesson plan, scheme of work, resource, assignment,
/// or homework. The backend stores these in separate collections but with a
/// broadly compatible shape (title/className/subject/dueDate/description/...).
class ContentItem {
  final String id;
  final String title;
  final String description;
  final String className;
  final String subject;
  final DateTime? dueDate;
  final double? totalMarks;
  final DateTime? createdAt;
  final Map<String, dynamic> raw;

  const ContentItem({
    required this.id, required this.title, this.description = '', this.className = '',
    this.subject = '', this.dueDate, this.totalMarks, this.createdAt, this.raw = const {},
  });

  factory ContentItem.fromJson(Map<String, dynamic> j) => ContentItem(
        id: (j['_id'] ?? j['id'] ?? '').toString(),
        title: (j['title'] ?? j['name'] ?? 'Untitled').toString(),
        description: (j['description'] ?? j['instructions'] ?? '').toString(),
        className: (j['className'] ?? j['class'] ?? '').toString(),
        subject: (j['subject'] ?? j['subjectName'] ?? '').toString(),
        dueDate: DateTime.tryParse((j['dueDate'] ?? '').toString()),
        totalMarks: (j['totalMarks'] ?? j['maxPoints']) is num ? (j['totalMarks'] ?? j['maxPoints'] as num).toDouble() : null,
        createdAt: DateTime.tryParse((j['createdAt'] ?? '').toString()),
        raw: j,
      );
}

class Submission {
  final String id;
  final String studentId;
  final String studentName;
  final String status; // Submitted | Graded | Late | Missing
  final double? marks;
  final String? feedback;
  final DateTime? submittedAt;

  const Submission({
    required this.id, required this.studentId, required this.studentName,
    this.status = 'Submitted', this.marks, this.feedback, this.submittedAt,
  });

  factory Submission.fromJson(Map<String, dynamic> j) => Submission(
        id: (j['_id'] ?? j['id'] ?? '').toString(),
        studentId: (j['studentId'] ?? '').toString(),
        studentName: (j['studentName'] ?? 'Student').toString(),
        status: (j['status'] ?? 'Submitted').toString(),
        marks: (j['marks'] as num?)?.toDouble(),
        feedback: j['feedback']?.toString(),
        submittedAt: DateTime.tryParse((j['submittedAt'] ?? j['createdAt'] ?? '').toString()),
      );
}
