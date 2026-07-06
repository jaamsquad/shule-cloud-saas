import 'package:connectivity_plus/connectivity_plus.dart';

/// Online/offline stream + one-shot check, used for the offline banner and
/// cache-first loading.
class ConnectivityService {
  final Connectivity _c = Connectivity();

  Stream<bool> get onlineStream =>
      _c.onConnectivityChanged.map((list) => list.any((r) => r != ConnectivityResult.none));

  Future<bool> get isOnline async {
    final r = await _c.checkConnectivity();
    return r.any((x) => x != ConnectivityResult.none);
  }
}
