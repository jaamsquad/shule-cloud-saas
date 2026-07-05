import 'package:connectivity_plus/connectivity_plus.dart';

/// Reports online/offline transitions so the app can flush the offline GPS queue
/// the moment connectivity returns.
class ConnectivityService {
  final Connectivity _c = Connectivity();

  Stream<bool> get onlineStream => _c.onConnectivityChanged.map(_isOnline);

  Future<bool> get isOnline async => _isOnline(await _c.checkConnectivity());

  bool _isOnline(List<ConnectivityResult> results) =>
      results.any((r) => r != ConnectivityResult.none);
}
