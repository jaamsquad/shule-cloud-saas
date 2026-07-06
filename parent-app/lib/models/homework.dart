enum TaskStatus { pending, submitted, graded, overdue }

TaskStatus taskFrom(String? s) => switch ((s ?? '').toLowerCase()) {
      'submitted' => TaskStatus.submitted,
      'graded' => TaskStatus.graded,
      'overdue' => TaskStatus.overdue,
      _ => TaskStatus.pending,
    };

class Homework {
  final String id;
  final String subject;
  final String title;
  final String description;
  final String teacher;
  final String dueDate;
  final int attachments;
  final String? attachmentUrl;
  final TaskStatus status;

  const Homework({
    required this.id,
    required this.subject,
    required this.title,
    this.description = '',
    this.teacher = '',
    this.dueDate = '',
    this.attachments = 0,
    this.attachmentUrl,
    this.status = TaskStatus.pending,
  });

  factory Homework.fromJson(Map<String, dynamic> j) => Homework(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        subject: (j['subject'] ?? '').toString(),
        title: (j['title'] ?? j['name'] ?? 'Assignment').toString(),
        description: (j['description'] ?? '').toString(),
        teacher: (j['teacher'] ?? j['teacherName'] ?? '').toString(),
        dueDate: (j['dueDate'] ?? j['due'] ?? '').toString(),
        attachments: (j['attachments'] is num) ? (j['attachments'] as num).toInt()
            : (j['attachments'] is List ? (j['attachments'] as List).length : 0),
        attachmentUrl: (j['attachmentUrl'] ?? j['fileUrl'])?.toString(),
        status: taskFrom(j['status']?.toString()),
      );
}
