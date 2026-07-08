class StudentLite {
  final String id;
  final String name;
  final String admissionNo;
  final String? photoUrl;
  final String status; // attendance status if present in context
  final bool hasParentPhone;

  const StudentLite({
    required this.id, required this.name, this.admissionNo = '', this.photoUrl,
    this.status = '', this.hasParentPhone = false,
  });

  factory StudentLite.fromJson(Map<String, dynamic> j) => StudentLite(
        id: (j['_id'] ?? j['studentId'] ?? j['id'] ?? '').toString(),
        name: (j['studentName'] ?? j['name'] ?? 'Student').toString(),
        admissionNo: (j['registrationNo'] ?? j['admNo'] ?? j['admissionNo'] ?? '').toString(),
        photoUrl: (j['photo'] ?? j['photoUrl'])?.toString(),
        status: (j['status'] ?? '').toString(),
        hasParentPhone: j['hasPhone'] == true || j['hasParentPhone'] == true,
      );
}

class RosterMark {
  final String studentId;
  final String name;
  final String admissionNo;
  double? marks;
  const RosterMark({required this.studentId, required this.name, this.admissionNo = '', this.marks});

  factory RosterMark.fromJson(Map<String, dynamic> j) => RosterMark(
        studentId: (j['studentId'] ?? j['_id'] ?? '').toString(),
        name: (j['studentName'] ?? j['name'] ?? 'Student').toString(),
        admissionNo: (j['registrationNo'] ?? j['admNo'] ?? '').toString(),
        marks: (j['marks'] as num?)?.toDouble(),
      );
}
