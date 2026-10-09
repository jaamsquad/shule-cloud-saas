// Data models for the student portal endpoints (/auth/student-portal/*).
// Every parser is defensive: fields the backend omits fall back to sensible
// defaults rather than throwing.

double _d(Object? v) => v is num ? v.toDouble() : double.tryParse('${v ?? ''}') ?? 0;
int _i(Object? v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}') ?? 0;
String _s(Object? v) => v == null ? '' : '$v';
DateTime? _date(Object? v) => v == null ? null : DateTime.tryParse('$v');
Map<String, dynamic> _map(Object? v) => v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};
List<Map<String, dynamic>> _list(Object? v) => v is List ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : const [];

/// The signed-in student.
class Student {
  final String id;
  final String name;
  final String registrationNo;
  final String className;
  final String stream;
  final String gender;
  final String portalUsername;
  final String? photoUrl;
  final String dateOfBirth;
  final String admissionDate;
  final String parentName;
  final String parentPhone;
  final String house;

  const Student({
    required this.id,
    required this.name,
    this.registrationNo = '',
    this.className = '',
    this.stream = '',
    this.gender = '',
    this.portalUsername = '',
    this.photoUrl,
    this.dateOfBirth = '',
    this.admissionDate = '',
    this.parentName = '',
    this.parentPhone = '',
    this.house = '',
  });

  factory Student.fromJson(Map<String, dynamic> j) => Student(
        id: _s(j['_id'] ?? j['id']),
        name: _s(j['studentName'] ?? j['name'] ?? 'Student'),
        registrationNo: _s(j['registrationNo'] ?? j['admNo']),
        className: _s(j['studentClass'] ?? j['currentClass'] ?? j['class'] ?? j['className']),
        stream: _s(j['stream'] ?? j['streamName']),
        gender: _s(j['gender']),
        portalUsername: _s(j['portalUsername']),
        photoUrl: (j['studentPhoto'] ?? j['photo'] ?? j['photoUrl'])?.toString(),
        dateOfBirth: _s(j['dateOfBirth'] ?? j['dob']),
        admissionDate: _s(j['admissionDate']),
        parentName: _s(j['parentName'] ?? j['guardianName'] ?? j['fatherName'] ?? j['motherName']),
        parentPhone: _s(j['parentPhone'] ?? j['guardianPhone'] ?? j['fatherPhone'] ?? j['motherPhone']),
        house: _s(j['house']),
      );

  Map<String, dynamic> toJson() => {
        '_id': id, 'name': name, 'registrationNo': registrationNo, 'class': className, 'stream': stream,
        'gender': gender, 'portalUsername': portalUsername, 'photo': photoUrl, 'dateOfBirth': dateOfBirth,
        'admissionDate': admissionDate, 'parentName': parentName, 'parentPhone': parentPhone, 'house': house,
      };
}

/// /student-portal/summary
class PortalSummary {
  final String currentTerm;
  final String registrationStatus;
  final double totalBilled;
  final double totalPaid;
  final double balance;
  const PortalSummary({this.currentTerm = '', this.registrationStatus = '', this.totalBilled = 0, this.totalPaid = 0, this.balance = 0});

  factory PortalSummary.fromJson(Map<String, dynamic> j) => PortalSummary(
        currentTerm: _s(j['currentTerm']),
        registrationStatus: _s(j['registrationStatus']),
        totalBilled: _d(j['totalBilled']),
        totalPaid: _d(j['totalPaid']),
        balance: _d(j['balance']),
      );

  bool get registered => registrationStatus.toLowerCase() == 'registered';
}

/// One entry in the term's academic calendar.
class CalendarActivity {
  final String name;
  final String type;
  final DateTime? date;
  final DateTime? endDate;
  const CalendarActivity({required this.name, this.type = 'event', this.date, this.endDate});

  factory CalendarActivity.fromJson(Map<String, dynamic> j) =>
      CalendarActivity(name: _s(j['name']), type: _s(j['type']), date: _date(j['date']), endDate: _date(j['endDate']));
}

class AcademicCalendar {
  final String termName;
  final List<CalendarActivity> activities;
  const AcademicCalendar({this.termName = '', this.activities = const []});

  factory AcademicCalendar.fromJson(Map<String, dynamic> j) {
    final term = _map(j['term']);
    return AcademicCalendar(
      termName: _s(term['name'] ?? term['termName']),
      activities: _list(j['activities']).map(CalendarActivity.fromJson).toList()
        ..sort((a, b) => (a.date ?? DateTime(2100)).compareTo(b.date ?? DateTime(2100))),
    );
  }
}

class SubjectResult {
  final String name;
  final double marks;
  final double outOf;
  final String grade;
  const SubjectResult({required this.name, this.marks = 0, this.outOf = 100, this.grade = ''});

  factory SubjectResult.fromJson(Map<String, dynamic> j) =>
      SubjectResult(name: _s(j['name']), marks: _d(j['marks']), outOf: _d(j['outOf'] ?? 100), grade: _s(j['grade']));

  double get percent => outOf > 0 ? marks / outOf * 100 : 0;
}

/// One exam's results (/student-portal/exam-results).
class ExamResult {
  final String examId;
  final String examName;
  final String term;
  final String academicYear;
  final List<SubjectResult> subjects;
  final double totalMarks;
  final double totalOutOf;
  final double average;
  const ExamResult({
    required this.examId,
    required this.examName,
    this.term = '',
    this.academicYear = '',
    this.subjects = const [],
    this.totalMarks = 0,
    this.totalOutOf = 0,
    this.average = 0,
  });

  factory ExamResult.fromJson(Map<String, dynamic> j) => ExamResult(
        examId: _s(j['examId']),
        examName: _s(j['examName'] ?? 'Exam'),
        term: _s(j['term']),
        academicYear: _s(j['academicYear']),
        subjects: _list(j['subjects']).map(SubjectResult.fromJson).toList(),
        totalMarks: _d(j['totalMarks']),
        totalOutOf: _d(j['totalOutOf']),
        average: _d(j['average']),
      );
}

class Lesson {
  final String subject;
  final String teacher;
  final String room;
  const Lesson({this.subject = '', this.teacher = '', this.room = ''});
  factory Lesson.fromJson(Map<String, dynamic> j) => Lesson(subject: _s(j['subject']), teacher: _s(j['teacher']), room: _s(j['room']));
  bool get isEmpty => subject.isEmpty;
}

/// /student-portal/timetable → { timeSlots: [...], grid: { day: { slot: lesson } } }
class Timetable {
  final List<String> timeSlots;
  final Map<String, Map<String, Lesson>> grid;
  const Timetable({this.timeSlots = const [], this.grid = const {}});

  factory Timetable.fromJson(Map<String, dynamic> j) {
    final grid = <String, Map<String, Lesson>>{};
    _map(j['grid']).forEach((day, bySlot) {
      grid[day] = {for (final e in _map(bySlot).entries) e.key: Lesson.fromJson(_map(e.value))};
    });
    return Timetable(timeSlots: (j['timeSlots'] as List?)?.map((e) => '$e').toList() ?? const [], grid: grid);
  }
}

/// An assignment or homework item, with this student's submission (if any).
class TaskItem {
  final String id;
  final String title;
  final String description;
  final String subject;
  final String teacher;
  final DateTime? dueDate;
  final double? totalMarks;
  final String submissionStatus; // '' | Submitted | Graded
  final String answer;
  final double? marks;
  final String feedback;

  const TaskItem({
    required this.id,
    required this.title,
    this.description = '',
    this.subject = '',
    this.teacher = '',
    this.dueDate,
    this.totalMarks,
    this.submissionStatus = '',
    this.answer = '',
    this.marks,
    this.feedback = '',
  });

  factory TaskItem.fromJson(Map<String, dynamic> j) {
    final sub = _map(j['submission']);
    final marks = sub['marks'] ?? sub['score'];
    final total = j['totalMarks'] ?? j['maxPoints'] ?? j['marks'];
    return TaskItem(
      id: _s(j['_id'] ?? j['id']),
      title: _s(j['title'] ?? j['name'] ?? 'Untitled'),
      description: _s(j['description'] ?? j['instructions']),
      subject: _s(j['subject'] ?? j['subjectName']),
      teacher: _s(j['teacherName'] ?? j['createdByName'] ?? j['teacher']),
      dueDate: _date(j['dueDate'] ?? j['deadline']),
      totalMarks: total is num ? total.toDouble() : null,
      submissionStatus: sub.isEmpty ? '' : _s(sub['status'] ?? 'Submitted'),
      answer: _s(sub['answer']),
      marks: marks is num ? marks.toDouble() : null,
      feedback: _s(sub['feedback']),
    );
  }

  bool get submitted => submissionStatus.isNotEmpty;
  bool get overdue => !submitted && dueDate != null && dueDate!.isBefore(DateTime.now());
}

class Resource {
  final String id;
  final String title;
  final String type;
  final String subject;
  final String description;
  final String url;
  final String fileName;
  final bool hasFile;
  const Resource({
    required this.id,
    required this.title,
    this.type = '',
    this.subject = '',
    this.description = '',
    this.url = '',
    this.fileName = '',
    this.hasFile = false,
  });

  factory Resource.fromJson(Map<String, dynamic> j) => Resource(
        id: _s(j['_id'] ?? j['id']),
        title: _s(j['title'] ?? 'Resource'),
        type: _s(j['type']),
        subject: _s(j['subjectName'] ?? j['subject']),
        description: _s(j['description']),
        url: _s(j['url'] ?? j['link']),
        fileName: _s(j['fileName']),
        hasFile: _s(j['fileData']).isNotEmpty,
      );
}

class Invoice {
  final String id;
  final String number;
  final String term;
  final double total;
  final double paid;
  final double balance;
  final String status;
  final DateTime? date;
  const Invoice({required this.id, this.number = '', this.term = '', this.total = 0, this.paid = 0, this.balance = 0, this.status = '', this.date});

  factory Invoice.fromJson(Map<String, dynamic> j) {
    final total = _d(j['total_due'] ?? j['amount']);
    final paid = _d(j['paid_amount'] ?? j['amount_paid']);
    return Invoice(
      id: _s(j['_id'] ?? j['id']),
      number: _s(j['invoice_no'] ?? j['invoiceNo'] ?? j['invoiceNumber']),
      term: _s(j['term'] ?? j['termName']),
      total: total,
      paid: paid,
      balance: j['balance'] is num ? (j['balance'] as num).toDouble() : (total - paid).clamp(0, double.infinity).toDouble(),
      status: _s(j['status']),
      date: _date(j['createdAt'] ?? j['date']),
    );
  }
}

class FeeItem {
  final String name;
  final double amount;
  const FeeItem({required this.name, this.amount = 0});
  factory FeeItem.fromJson(Map<String, dynamic> j) =>
      FeeItem(name: _s(j['name'] ?? j['voteHead'] ?? j['item'] ?? j['label'] ?? 'Fee'), amount: _d(j['amount'] ?? j['total']));
}

/// /student-portal/fees
class FeesSummary {
  final String term;
  final double billed;
  final double totalPaid;
  final double balance;
  final double structureTotal;
  final List<FeeItem> items;
  final List<Invoice> invoices;
  const FeesSummary({
    this.term = '',
    this.billed = 0,
    this.totalPaid = 0,
    this.balance = 0,
    this.structureTotal = 0,
    this.items = const [],
    this.invoices = const [],
  });

  factory FeesSummary.fromJson(Map<String, dynamic> j) => FeesSummary(
        term: j['term'] is Map ? _s(_map(j['term'])['name']) : _s(j['term']),
        billed: _d(j['billed']),
        totalPaid: _d(j['totalPaid']),
        balance: _d(j['balance']),
        structureTotal: _d(j['structureTotal']),
        items: _list(j['items']).map(FeeItem.fromJson).toList(),
        invoices: _list(j['invoices']).map(Invoice.fromJson).toList(),
      );
}

class Receipt {
  final String id;
  final String receiptNo;
  final DateTime? date;
  final String paymentMode;
  final double amount;
  final String status;
  final String reference;
  final String purpose;
  final String servedBy;
  const Receipt({
    required this.id,
    this.receiptNo = '',
    this.date,
    this.paymentMode = '',
    this.amount = 0,
    this.status = '',
    this.reference = '',
    this.purpose = '',
    this.servedBy = '',
  });

  factory Receipt.fromJson(Map<String, dynamic> j) => Receipt(
        id: _s(j['_id']),
        receiptNo: _s(j['receiptNo']),
        date: _date(j['date']),
        paymentMode: _s(j['paymentMode']),
        amount: _d(j['amount']),
        status: _s(j['status']),
        reference: _s(j['reference']),
        purpose: _s(j['purpose']),
        servedBy: _s(j['servedBy']),
      );
}

class WalletTxn {
  final String type; // credit | debit
  final double amount;
  final String description;
  final String category;
  final DateTime? date;
  const WalletTxn({this.type = '', this.amount = 0, this.description = '', this.category = '', this.date});

  factory WalletTxn.fromJson(Map<String, dynamic> j) => WalletTxn(
        type: _s(j['type']).toLowerCase(),
        amount: _d(j['amount']),
        description: _s(j['description'] ?? j['narration']),
        category: _s(j['category']),
        date: _date(j['createdAt']),
      );

  bool get isCredit => type == 'credit' || type == 'topup' || type == 'deposit';
}

/// /student-portal/wallet → { wallet, transactions }
class StudentWallet {
  final String code;
  final double balance;
  final bool allowFeePayment;
  final List<WalletTxn> transactions;
  const StudentWallet({this.code = '', this.balance = 0, this.allowFeePayment = true, this.transactions = const []});

  factory StudentWallet.fromJson(Map<String, dynamic> j) {
    final w = _map(j['wallet']);
    return StudentWallet(
      code: _s(w['code']),
      balance: _d(w['balance']),
      allowFeePayment: w['allowFeePayment'] != false,
      transactions: _list(j['transactions']).map(WalletTxn.fromJson).toList(),
    );
  }
}

int parseInt(Object? v) => _i(v);
