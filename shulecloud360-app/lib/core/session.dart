import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'config.dart';

/// Who is signed in. One login for everyone; the server decides what they are.
enum UserKind { admin, teacher, student, parent }

class Session {
  final UserKind kind;
  final String token;          // the token for this person's main area
  final String? staffToken;    // teacher-portal token (admins who also teach)
  final String subdomain;      // the school, resolved by the server
  final String schoolCode;     // what they typed (School ID or address)
  final String name;
  final String role;
  final Map<String, dynamic> user;   // as the web stores it (user / student_info / parent_info / staff_info)
  final Map<String, dynamic>? staffInfo;
  // admin-app permissions (from /auth/my-permissions)
  final List<String> modules;
  final List<String> permissions;
  final Map<String, List<String>> crud;
  final List<String>? planModules;
  final List<String> disabledApps;     // switched off for this school by ShuleCloud
  final List<String> disabledModules;
  final String portal;                 // 'admin' or 'teacher' — for staff who have both

  const Session({
    required this.kind, required this.token, this.staffToken, required this.subdomain, required this.schoolCode,
    required this.name, required this.role, required this.user, this.staffInfo,
    this.modules = const [], this.permissions = const [], this.crud = const {}, this.planModules,
    this.disabledApps = const [], this.disabledModules = const [], this.portal = 'admin',
  });

  bool get isAdmin => role == 'school_admin' || role == 'super_admin' || modules.contains('*') || permissions.contains('*');
  bool get canTeach => staffToken != null && staffToken!.isNotEmpty;
  /// Has both the admin portal and the teacher portal, so the app shows a switcher.
  bool get hasBothPortals => kind == UserKind.admin && canTeach;
  /// Working in the teacher portal right now (teacher-only staff, or switched).
  bool get teaching => kind == UserKind.teacher || (hasBothPortals && portal == 'teacher');

  Session copyWith({List<String>? modules, List<String>? permissions, Map<String, List<String>>? crud, List<String>? planModules, bool clearPlan = false, String? role,
          List<String>? disabledApps, List<String>? disabledModules, String? portal}) => Session(
        kind: kind, token: token, staffToken: staffToken, subdomain: subdomain, schoolCode: schoolCode, name: name,
        role: role ?? this.role, user: user, staffInfo: staffInfo,
        modules: modules ?? this.modules, permissions: permissions ?? this.permissions, crud: crud ?? this.crud,
        planModules: clearPlan ? null : (planModules ?? this.planModules),
        disabledApps: disabledApps ?? this.disabledApps, disabledModules: disabledModules ?? this.disabledModules,
        portal: portal ?? this.portal,
      );

  Map<String, dynamic> toJson() => {
        'kind': kind.name, 'token': token, 'staffToken': staffToken, 'subdomain': subdomain, 'schoolCode': schoolCode,
        'name': name, 'role': role, 'user': user, 'staffInfo': staffInfo,
        'modules': modules, 'permissions': permissions, 'crud': crud, 'planModules': planModules,
        'disabledApps': disabledApps, 'disabledModules': disabledModules, 'portal': portal,
      };

  static Session fromJson(Map<String, dynamic> j) => Session(
        kind: UserKind.values.firstWhere((k) => k.name == j['kind'], orElse: () => UserKind.admin),
        token: j['token'] ?? '', staffToken: j['staffToken'], subdomain: j['subdomain'] ?? '', schoolCode: j['schoolCode'] ?? '',
        name: j['name'] ?? '', role: j['role'] ?? '', user: Map<String, dynamic>.from(j['user'] ?? {}),
        staffInfo: j['staffInfo'] == null ? null : Map<String, dynamic>.from(j['staffInfo']),
        modules: List<String>.from(j['modules'] ?? const []), permissions: List<String>.from(j['permissions'] ?? const []),
        crud: (j['crud'] as Map? ?? {}).map((k, v) => MapEntry(k.toString(), List<String>.from(v ?? const []))),
        planModules: j['planModules'] == null ? null : List<String>.from(j['planModules']),
        disabledApps: List<String>.from(j['disabledApps'] ?? const []), disabledModules: List<String>.from(j['disabledModules'] ?? const []),
        portal: (j['portal'] ?? 'admin').toString(),
      );

  /// The token that a request to [path] should carry.
  String tokenFor(String path) {
    if (path.startsWith('/auth/staff-portal') && staffToken != null) return staffToken!;
    return token;
  }
}

/// A sign-in that still needs the emailed code.
class OtpChallenge {
  final String challengeId, sentTo, schoolCode;
  final int minutes;
  final bool canRemember;
  final int trustDays;
  const OtpChallenge(this.challengeId, this.sentTo, this.minutes, this.canRemember, this.trustDays, this.schoolCode);
}

class LoginFailure implements Exception {
  final String message;
  const LoginFailure(this.message);
  @override
  String toString() => message;
}

String errorText(Object e, [String fallback = 'Something went wrong. Try again.']) {
  if (e is LoginFailure) return e.message;
  if (e is DioException) {
    final d = e.response?.data;
    if (d is Map) {
      if (d['message'] != null) return d['message'].toString();
      final errs = d['errors'];
      if (errs is List && errs.isNotEmpty && errs.first is Map && errs.first['message'] != null) return errs.first['message'].toString();
    }
    if (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout) return 'No connection to ShuleCloud. Check your internet.';
  }
  return fallback;
}

class SessionController extends StateNotifier<AsyncValue<Session?>> {
  SessionController() : super(const AsyncValue.loading()) { _restore(); }

  static const _store = FlutterSecureStorage();
  static const _key = 'sc360_session';
  final Dio _dio = Dio(BaseOptions(baseUrl: AppConfig.apiBase, connectTimeout: const Duration(seconds: 20), receiveTimeout: const Duration(seconds: 30)));

  Future<void> _restore() async {
    try {
      final raw = await _store.read(key: _key);
      final s = raw == null ? null : Session.fromJson(jsonDecode(raw));
      state = AsyncValue.data(s);
      if (s != null && s.kind == UserKind.admin) refreshPermissions();
    } catch (_) {
      state = const AsyncValue.data(null);
    }
  }

  Future<void> _save(Session? s) async {
    if (s == null) { await _store.delete(key: _key); } else { await _store.write(key: _key, value: jsonEncode(s.toJson())); }
    state = AsyncValue.data(s);
  }

  Future<String?> _trust(String school) => _store.read(key: 'sc360_trust_${school.toLowerCase()}');

  /// Returns null when signed in, or the emailed-code challenge to complete.
  Future<OtpChallenge?> login({required String schoolCode, required String username, required String password}) async {
    final school = schoolCode.trim();
    try {
      final res = await _dio.post('/auth/smart-login',
          data: {'username': username.trim(), 'password': password, 'subdomain': school, 'trustToken': await _trust(school)},
          options: Options(headers: {'x-tenant-subdomain': school}));
      final data = Map<String, dynamic>.from(res.data as Map);
      if (data['twoFactorRequired'] == true) {
        return OtpChallenge(data['challengeId'], data['sentTo'] ?? 'your email', (data['expiresInMinutes'] ?? 10) as int,
            data['canRemember'] != false, (data['trustDays'] ?? 30) as int, school);
      }
      await _complete(data, school);
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 403 && (e.response?.data is Map) && e.response?.data['code'] == 'TENANT_PENDING') {
        throw const LoginFailure('This school is not active yet. Contact ShuleCloud support.');
      }
      throw LoginFailure(errorText(e, 'Sign-in failed. Check your details.'));
    }
  }

  Future<void> verifyOtp(OtpChallenge c, String code, bool remember) async {
    try {
      final res = await _dio.post('/auth/2fa/verify', data: {'challengeId': c.challengeId, 'code': code, 'remember': remember});
      final data = Map<String, dynamic>.from(res.data as Map);
      if (data['trustToken'] != null) await _store.write(key: 'sc360_trust_${c.schoolCode.toLowerCase()}', value: data['trustToken']);
      await _complete(data, c.schoolCode);
    } on DioException catch (e) {
      throw LoginFailure(errorText(e, 'Could not verify the code.'));
    }
  }

  Future<String> resendOtp(OtpChallenge c) async {
    try {
      final res = await _dio.post('/auth/2fa/resend', data: {'challengeId': c.challengeId});
      return (res.data as Map)['message']?.toString() ?? 'A new code has been sent.';
    } on DioException catch (e) {
      throw LoginFailure(errorText(e, 'Could not resend the code.'));
    }
  }

  /// Turn the server's sign-in answer into a session (same rules as the web login page).
  Future<void> _complete(Map<String, dynamic> d, String schoolCode) async {
    final type = (d['user_type'] ?? 'admin').toString();
    final token = (d['access_token'] ?? d['token'] ?? '').toString();
    final sub = (d['tenantSubdomain'] ?? schoolCode).toString().toLowerCase();
    if (token.isEmpty) throw const LoginFailure('Sign-in failed. Try again.');
    final sso = d['staffSso'] is Map ? Map<String, dynamic>.from(d['staffSso']) : null;
    Session s;
    if (type == 'student') {
      final u = Map<String, dynamic>.from(d['user'] ?? {});
      s = Session(kind: UserKind.student, token: token, subdomain: sub, schoolCode: schoolCode, name: (u['name'] ?? 'Student').toString(), role: 'student', user: u);
    } else if (type == 'parent') {
      final p = Map<String, dynamic>.from(d['parent'] ?? {});
      s = Session(kind: UserKind.parent, token: token, subdomain: sub, schoolCode: schoolCode, name: (p['name'] ?? 'Parent').toString(), role: 'parent', user: p);
    } else if (d['redirectPortal'] == 'staff') {
      final staff = Map<String, dynamic>.from(sso?['staff'] ?? d['user'] ?? {});
      final t = (sso?['token'] ?? token).toString();
      s = Session(kind: UserKind.teacher, token: t, staffToken: t, subdomain: sub, schoolCode: schoolCode, name: (staff['name'] ?? 'Teacher').toString(), role: 'teacher', user: staff, staffInfo: staff);
    } else {
      final u = Map<String, dynamic>.from(d['user'] ?? {});
      final String? teachToken = sso == null ? null : sso['token']?.toString();
      s = Session(
        kind: UserKind.admin, token: token, staffToken: teachToken,
        subdomain: sub, schoolCode: schoolCode, name: (u['name'] ?? u['email'] ?? 'User').toString(), role: (u['role'] ?? 'school_admin').toString().toLowerCase(),
        user: u, staffInfo: sso?['staff'] == null ? null : Map<String, dynamic>.from(sso!['staff']),
      );
    }
    await _save(s);
    if (s.kind == UserKind.admin) await refreshPermissions();
  }

  /// What this admin-app user may open (same endpoint the web uses).
  Future<void> refreshPermissions() async {
    final s = state.valueOrNull;
    if (s == null || s.kind != UserKind.admin) return;
    try {
      final res = await _dio.get('/auth/my-permissions', options: Options(headers: {'Authorization': 'Bearer ${s.token}', 'x-tenant-subdomain': s.subdomain}));
      final d = Map<String, dynamic>.from(res.data as Map);
      await _save(s.copyWith(
        role: (d['role'] ?? s.role).toString().toLowerCase(),
        modules: List<String>.from(d['modules'] ?? const []),
        permissions: List<String>.from(d['permissions'] ?? const []),
        crud: (d['crud'] as Map? ?? {}).map((k, v) => MapEntry(k.toString(), List<String>.from(v ?? const []))),
        planModules: d['planModules'] == null ? null : List<String>.from(d['planModules']),
        clearPlan: d['planModules'] == null,
        disabledApps: List<String>.from(d['disabledApps'] ?? const []),
        disabledModules: List<String>.from(d['disabledModules'] ?? const []),
      ));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) await logout();
    } catch (_) {/* keep what we had */}
  }

  /// Staff with both portals: switch between the admin portal and the teacher portal.
  Future<void> switchPortal(String portal) async {
    final s = state.valueOrNull;
    if (s == null || !s.hasBothPortals || s.portal == portal) return;
    await _save(s.copyWith(portal: portal));
  }

  Future<void> logout() async => _save(null);
}

final sessionProvider = StateNotifierProvider<SessionController, AsyncValue<Session?>>((ref) => SessionController());
