class Staff {
  final String id;
  final String name;
  final String designation;
  final String portalUsername;
  final String email;
  final String phone;
  final String? photoUrl;
  final List<String> permissions;

  const Staff({
    required this.id, required this.name, this.designation = 'Teacher',
    this.portalUsername = '', this.email = '', this.phone = '', this.photoUrl,
    this.permissions = const [],
  });

  factory Staff.fromJson(Map<String, dynamic> j) => Staff(
        id: (j['_id'] ?? j['id'] ?? '').toString(),
        name: (j['name'] ?? j['employeeName'] ?? 'Teacher').toString(),
        designation: (j['designation'] ?? 'Teacher').toString(),
        portalUsername: (j['portalUsername'] ?? '').toString(),
        email: (j['email'] ?? '').toString(),
        phone: (j['phone'] ?? '').toString(),
        photoUrl: (j['photo'] ?? j['photoUrl'] ?? j['avatar'])?.toString(),
        permissions: (j['permissions'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      );

  Map<String, dynamic> toJson() => {
        'id': id, 'name': name, 'designation': designation, 'portalUsername': portalUsername,
        'email': email, 'phone': phone, 'photo': photoUrl, 'permissions': permissions,
      };
}

/// A (class, subject) pair a teacher teaches, or a class they head.
class ClassAssignment {
  final String classId;
  final String className;
  final String subject;
  final int studentCount;
  final bool isClassTeacher;
  const ClassAssignment({
    required this.classId, required this.className, this.subject = '',
    this.studentCount = 0, this.isClassTeacher = false,
  });

  factory ClassAssignment.fromJson(Map<String, dynamic> j) => ClassAssignment(
        classId: (j['classId'] ?? '').toString(),
        className: (j['className'] ?? j['name'] ?? '').toString(),
        subject: (j['subject'] ?? j['subjectName'] ?? '').toString(),
        studentCount: (j['studentCount'] as num?)?.toInt() ?? 0,
        isClassTeacher: j['isClassTeacher'] == true,
      );
}

class DashboardSummary {
  final int classCount;
  final int subjectCount;
  final int lessonsPerWeek;
  final int classTeacherCount;
  final int studentsPresent;
  final int studentsAbsent;
  final int pendingAssignments;
  final double averagePerformance;

  const DashboardSummary({
    this.classCount = 0, this.subjectCount = 0, this.lessonsPerWeek = 0, this.classTeacherCount = 0,
    this.studentsPresent = 0, this.studentsAbsent = 0, this.pendingAssignments = 0, this.averagePerformance = 0,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> j) => DashboardSummary(
        classCount: (j['classCount'] as num?)?.toInt() ?? 0,
        subjectCount: (j['subjectCount'] as num?)?.toInt() ?? 0,
        lessonsPerWeek: (j['lessonsPerWeek'] as num?)?.toInt() ?? 0,
        classTeacherCount: (j['classTeacherCount'] as num?)?.toInt() ?? 0,
        studentsPresent: (j['studentsPresent'] as num?)?.toInt() ?? 0,
        studentsAbsent: (j['studentsAbsent'] as num?)?.toInt() ?? 0,
        pendingAssignments: (j['pendingAssignments'] as num?)?.toInt() ?? 0,
        averagePerformance: (j['averagePerformance'] as num?)?.toDouble() ?? 0,
      );
}

class Announcement {
  final String id;
  final String title;
  final String body;
  final String audience;
  final DateTime? createdAt;
  const Announcement({required this.id, required this.title, this.body = '', this.audience = 'All', this.createdAt});

  factory Announcement.fromJson(Map<String, dynamic> j) => Announcement(
        id: (j['_id'] ?? j['id'] ?? '').toString(),
        title: (j['title'] ?? 'Announcement').toString(),
        body: (j['message'] ?? j['body'] ?? '').toString(),
        audience: (j['audience'] ?? 'All').toString(),
        createdAt: DateTime.tryParse((j['createdAt'] ?? '').toString()),
      );
}
