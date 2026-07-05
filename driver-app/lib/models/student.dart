enum BoardingStatus { waiting, boarded, dropped }

BoardingStatus boardingFromString(String? s) {
  switch ((s ?? '').toLowerCase()) {
    case 'boarded':
      return BoardingStatus.boarded;
    case 'dropped':
      return BoardingStatus.dropped;
    default:
      return BoardingStatus.waiting;
  }
}

/// A student assigned to today's route.
class Student {
  final String id;
  final String name;
  final String admissionNo;
  final String className;
  final String? photoUrl;
  final String pickupStop;
  final String dropStop;
  final String? parentName;
  final String? parentPhone;
  final String? medicalAlert;
  final BoardingStatus status;

  const Student({
    required this.id,
    required this.name,
    required this.admissionNo,
    required this.className,
    this.photoUrl,
    required this.pickupStop,
    required this.dropStop,
    this.parentName,
    this.parentPhone,
    this.medicalAlert,
    this.status = BoardingStatus.waiting,
  });

  factory Student.fromJson(Map<String, dynamic> j) => Student(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        name: (j['name'] ?? j['studentName'] ?? 'Student').toString(),
        admissionNo: (j['admissionNo'] ?? j['registrationNo'] ?? '').toString(),
        className: (j['className'] ?? j['class'] ?? '').toString(),
        photoUrl: (j['photoUrl'] ?? j['photo'])?.toString(),
        pickupStop: (j['pickupStop'] ?? '').toString(),
        dropStop: (j['dropStop'] ?? '').toString(),
        parentName: j['parentName']?.toString(),
        parentPhone: j['parentPhone']?.toString(),
        medicalAlert: j['medicalAlert']?.toString(),
        status: boardingFromString(j['status']?.toString()),
      );

  Student copyWith({BoardingStatus? status}) => Student(
        id: id,
        name: name,
        admissionNo: admissionNo,
        className: className,
        photoUrl: photoUrl,
        pickupStop: pickupStop,
        dropStop: dropStop,
        parentName: parentName,
        parentPhone: parentPhone,
        medicalAlert: medicalAlert,
        status: status ?? this.status,
      );
}
