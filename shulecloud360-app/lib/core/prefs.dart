import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'session.dart';

/// Recently opened and starred apps (Quick Access), per person on this phone.
class AppLists {
  final List<String> recent, starred;
  const AppLists(this.recent, this.starred);
}

class AppListsController extends StateNotifier<AppLists> {
  AppListsController(this._who) : super(const AppLists([], [])) { _load(); }
  final String _who;
  String get _r => 'sc360_recent_$_who';
  String get _s => 'sc360_starred_$_who';

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    state = AppLists(p.getStringList(_r) ?? const [], p.getStringList(_s) ?? const []);
  }

  Future<void> touch(String key) async {
    if (state.recent.isNotEmpty && state.recent.first == key) return;
    final r = [key, ...state.recent.where((k) => k != key)].take(6).toList();
    state = AppLists(r, state.starred);
    (await SharedPreferences.getInstance()).setStringList(_r, r);
  }

  Future<void> toggleStar(String key) async {
    final s = state.starred.contains(key) ? state.starred.where((k) => k != key).toList() : [...state.starred, key];
    state = AppLists(state.recent, s);
    (await SharedPreferences.getInstance()).setStringList(_s, s);
  }
}

final appListsProvider = StateNotifierProvider<AppListsController, AppLists>((ref) {
  final s = ref.watch(sessionProvider).valueOrNull;
  return AppListsController(s == null ? 'anon' : '${s.subdomain}_${s.kind.name}_${s.name}');
});
