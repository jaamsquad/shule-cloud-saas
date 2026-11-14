import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/config.dart';
import '../../core/session.dart';
import '../../core/theme.dart';

/// A school as the sign-in screen shows it (from GET /public/school/:id).
class SchoolInfo {
  final String code;       // what the person signs in with (School ID, else the address)
  final String name, subdomain;
  final String? schoolId, logo, tagline, address;
  const SchoolInfo({required this.code, required this.name, required this.subdomain, this.schoolId, this.logo, this.tagline, this.address});

  factory SchoolInfo.fromJson(Map<String, dynamic> j, String typed) => SchoolInfo(
        code: (j['schoolId'] ?? j['code'] ?? typed).toString(),
        name: (j['name'] ?? typed).toString(),
        subdomain: (j['subdomain'] ?? typed).toString(),
        schoolId: j['schoolId']?.toString(),
        logo: j['logo']?.toString(),
        tagline: j['tagline']?.toString(),
        address: j['address']?.toString(),
      );

  Map<String, dynamic> toJson() => {'code': code, 'name': name, 'subdomain': subdomain, 'schoolId': schoolId, 'logo': logo, 'tagline': tagline, 'address': address};

  String get subtitle => [if (tagline != null && tagline!.isNotEmpty) tagline!, if (address != null && address!.isNotEmpty) address!].join(' · ');
}

final _dio = Dio(BaseOptions(baseUrl: AppConfig.apiBase, connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 20)));

/// Find a school by its School ID (or web address). Throws [LoginFailure] with a readable message.
Future<SchoolInfo> findSchool(String raw) async {
  final typed = raw.trim();
  if (typed.isEmpty) throw const LoginFailure('Enter your School ID.');
  try {
    final res = await _dio.get('/public/school/${Uri.encodeComponent(typed)}');
    return SchoolInfo.fromJson(Map<String, dynamic>.from(res.data as Map), typed.toUpperCase());
  } on DioException catch (e) {
    if (e.response?.statusCode == 404) {
      throw LoginFailure(errorText(e, 'No school found with that ID. Check it with your school.'));
    }
    throw LoginFailure(errorText(e, 'Could not look up the school. Try again.'));
  }
}

/// Schools picked on this phone before, newest first.
class RecentSchools {
  static const _key = 'sc360_recent_schools';

  static Future<List<SchoolInfo>> load() async {
    try {
      final raw = (await SharedPreferences.getInstance()).getString(_key);
      if (raw == null) return const [];
      return (jsonDecode(raw) as List).map((j) => SchoolInfo.fromJson(Map<String, dynamic>.from(j), '')).toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<void> remember(SchoolInfo s) async {
    final list = [s, ...(await load()).where((x) => x.code != s.code)].take(3).toList();
    final p = await SharedPreferences.getInstance();
    await p.setString(_key, jsonEncode(list.map((x) => x.toJson()).toList()));
    await p.setString('sc360_school', s.code);
  }

  static Future<void> forget(SchoolInfo s) async {
    final list = (await load()).where((x) => x.code != s.code).toList();
    (await SharedPreferences.getInstance()).setString(_key, jsonEncode(list.map((x) => x.toJson()).toList()));
  }
}

/// The school's logo, or its initials when it has none.
class SchoolLogo extends StatelessWidget {
  final SchoolInfo school;
  final double size;
  const SchoolLogo({super.key, required this.school, this.size = 52});

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      width: size, height: size,
      decoration: BoxDecoration(gradient: const LinearGradient(colors: [C.brand, Color(0xFF8B93FF)], begin: Alignment.topLeft, end: Alignment.bottomRight), borderRadius: BorderRadius.circular(size * 0.28)),
      alignment: Alignment.center,
      child: Text(_initials(school.name), style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * 0.34)),
    );
    final logo = school.logo ?? '';
    Widget? img;
    try {
      if (logo.startsWith('data:image')) {
        img = Image.memory(base64Decode(logo.split(',').last), fit: BoxFit.contain, errorBuilder: (_, __, ___) => fallback);
      } else if (logo.startsWith('http')) {
        img = Image.network(logo, fit: BoxFit.contain, errorBuilder: (_, __, ___) => fallback);
      } else if (logo.startsWith('/')) {
        img = Image.network('${Uri.parse(AppConfig.apiBase).origin}$logo', fit: BoxFit.contain, errorBuilder: (_, __, ___) => fallback);
      }
    } catch (_) {/* fall back to initials */}
    if (img == null) return fallback;
    return Container(
      width: size, height: size, padding: EdgeInsets.all(size * 0.08),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(size * 0.28), border: Border.all(color: C.slate200)),
      child: ClipRRect(borderRadius: BorderRadius.circular(size * 0.2), child: img),
    );
  }

  static String _initials(String n) {
    final w = n.split(RegExp(r'\s+')).where((x) => x.isNotEmpty && x[0].toUpperCase() != x[0].toLowerCase()).toList();
    if (w.isEmpty) return 'S';
    return (w.length == 1 ? w.first.substring(0, 1) : '${w[0][0]}${w[1][0]}').toUpperCase();
  }
}
