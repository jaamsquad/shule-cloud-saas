/// A child linked to the parent account.
class Student {
  final String id;
  final String name;
  final String admissionNo;
  final String className;
  final String stream;
  final String? photoUrl;
  final String? house;
  final double attendanceRate; // %
  final double feeBalance;
  final String status;

  const Student({
    required this.id,
    required this.name,
    required this.admissionNo,
    required this.className,
    this.stream = '',
    this.photoUrl,
    this.house,
    this.attendanceRate = 0,
    this.feeBalance = 0,
    this.status = 'Active',
  });

  factory Student.fromJson(Map<String, dynamic> j) => Student(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        name: (j['studentName'] ?? j['name'] ?? 'Student').toString(),
        admissionNo: (j['registrationNo'] ?? j['admNo'] ?? j['admissionNo'] ?? '').toString(),
        className: (j['studentClass'] ?? j['currentClass'] ?? j['className'] ?? j['class'] ?? '').toString(),
        stream: (j['stream'] ?? j['streamName'] ?? '').toString(),
        photoUrl: (j['photo'] ?? j['image'] ?? j['photoUrl'])?.toString(),
        house: j['house']?.toString(),
        attendanceRate: _d(j['attendanceRate'] ?? j['attendance']),
        feeBalance: _d(j['feeBalance'] ?? j['balance']),
        status: (j['status'] ?? 'Active').toString(),
      );

  static double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;

  Map<String, dynamic> toJson() => {
        'id': id, 'studentName': name, 'registrationNo': admissionNo,
        'studentClass': className, 'stream': stream, 'photo': photoUrl,
        'house': house, 'attendanceRate': attendanceRate, 'feeBalance': feeBalance, 'status': status,
      };
}
