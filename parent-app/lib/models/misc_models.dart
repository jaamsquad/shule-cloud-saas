import 'package:latlong2/latlong.dart';

// ── Library ────────────────────────────────────────────────────────────────
class LibraryBook {
  final String title;
  final String category;
  final String dueDate;
  final bool overdue;
  final bool renewable;
  const LibraryBook({required this.title, this.category = '', this.dueDate = '', this.overdue = false, this.renewable = true});
  factory LibraryBook.fromJson(Map<String, dynamic> j) => LibraryBook(
        title: (j['title'] ?? '').toString(),
        category: (j['category'] ?? '').toString(),
        dueDate: (j['dueDate'] ?? '').toString(),
        overdue: j['overdue'] == true,
        renewable: j['renewable'] != false,
      );
}

class LibrarySummary {
  final int borrowed;
  final int dueSoon;
  final double fines;
  final List<LibraryBook> loans;
  const LibrarySummary({this.borrowed = 0, this.dueSoon = 0, this.fines = 0, this.loans = const []});
  factory LibrarySummary.fromJson(Map<String, dynamic> j) => LibrarySummary(
        borrowed: (j['borrowed'] is num) ? (j['borrowed'] as num).toInt() : 0,
        dueSoon: (j['dueSoon'] is num) ? (j['dueSoon'] as num).toInt() : 0,
        fines: (j['fines'] is num) ? (j['fines'] as num).toDouble() : 0,
        loans: ((j['loans'] as List?) ?? []).map((e) => LibraryBook.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      );
}

// ── Messaging ──────────────────────────────────────────────────────────────
class MessageThread {
  final String id;
  final String sender;
  final String category; // Teachers | Admin | Transport
  final String preview;
  final String time;
  final bool unread;
  final String? avatarUrl;
  const MessageThread({required this.id, required this.sender, this.category = '', this.preview = '', this.time = '', this.unread = false, this.avatarUrl});
  factory MessageThread.fromJson(Map<String, dynamic> j) => MessageThread(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        sender: (j['sender'] ?? j['from'] ?? '').toString(),
        category: (j['category'] ?? '').toString(),
        preview: (j['preview'] ?? j['lastMessage'] ?? '').toString(),
        time: (j['time'] ?? j['updatedAt'] ?? '').toString(),
        unread: j['unread'] == true,
        avatarUrl: (j['avatarUrl'] ?? j['avatar'])?.toString(),
      );
}

// ── Announcements ──────────────────────────────────────────────────────────
class Announcement {
  final String id;
  final String category; // General | Academic | Transport | Events | Emergency
  final String title;
  final String body;
  final String author;
  final String time;
  final bool urgent;
  const Announcement({required this.id, this.category = 'General', this.title = '', this.body = '', this.author = '', this.time = '', this.urgent = false});
  factory Announcement.fromJson(Map<String, dynamic> j) => Announcement(
        id: (j['id'] ?? j['_id'] ?? '').toString(),
        category: (j['category'] ?? 'General').toString(),
        title: (j['title'] ?? '').toString(),
        body: (j['body'] ?? j['message'] ?? '').toString(),
        author: (j['author'] ?? j['by'] ?? '').toString(),
        time: (j['time'] ?? j['createdAt'] ?? '').toString(),
        urgent: j['urgent'] == true || '${j['category'] ?? ''}'.toLowerCase() == 'emergency',
      );
}

// ── Calendar events ────────────────────────────────────────────────────────
class CalendarEvent {
  final String title;
  final String category; // Holiday | Exam | Sports | Meeting
  final DateTime date;
  final String detail;
  const CalendarEvent({required this.title, this.category = '', required this.date, this.detail = ''});
  factory CalendarEvent.fromJson(Map<String, dynamic> j) => CalendarEvent(
        title: (j['title'] ?? j['name'] ?? '').toString(),
        category: (j['category'] ?? j['type'] ?? '').toString(),
        date: DateTime.tryParse('${j['date'] ?? j['eventDate'] ?? ''}') ?? DateTime.now(),
        detail: (j['detail'] ?? j['description'] ?? '').toString(),
      );
}

// ── Bus / transport ────────────────────────────────────────────────────────
class BusStatus {
  final String routeName;
  final String busPlate;
  final String driverName;
  final String? driverPhone;
  final bool online;
  final double? speedKmh;
  final LatLng? position;
  final LatLng? school;
  final LatLng? home;
  final String? etaText;
  final double? distanceKm;
  final String? lastUpdate;
  final String boardingStatus; // Boarded | Dropped | Waiting

  const BusStatus({
    this.routeName = '',
    this.busPlate = '',
    this.driverName = '',
    this.driverPhone,
    this.online = false,
    this.speedKmh,
    this.position,
    this.school,
    this.home,
    this.etaText,
    this.distanceKm,
    this.lastUpdate,
    this.boardingStatus = 'Waiting',
  });

  factory BusStatus.fromJson(Map<String, dynamic> j) {
    LatLng? pt(dynamic lat, dynamic lng) {
      final a = lat is num ? lat.toDouble() : double.tryParse('${lat ?? ''}');
      final b = lng is num ? lng.toDouble() : double.tryParse('${lng ?? ''}');
      return (a != null && b != null) ? LatLng(a, b) : null;
    }
    return BusStatus(
      routeName: (j['routeName'] ?? '').toString(),
      busPlate: (j['busPlate'] ?? '').toString(),
      driverName: (j['driverName'] ?? '').toString(),
      driverPhone: j['driverPhone']?.toString(),
      online: j['online'] == true,
      speedKmh: (j['speed'] is num) ? (j['speed'] as num).toDouble() * 3.6 : null,
      position: pt(j['lat'], j['lng']),
      school: pt(j['schoolLat'], j['schoolLng']),
      home: pt(j['homeLat'], j['homeLng']),
      etaText: j['eta']?.toString(),
      distanceKm: (j['distanceKm'] is num) ? (j['distanceKm'] as num).toDouble() : null,
      lastUpdate: j['lastSeen']?.toString(),
      boardingStatus: (j['boardingStatus'] ?? 'Waiting').toString(),
    );
  }
}
