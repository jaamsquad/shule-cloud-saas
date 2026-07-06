import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants/app_constants.dart';

/// Socket.IO client for live updates (bus position, attendance-marked pushes).
/// Best-effort: if the server has no socket namespace, the app still works via
/// polling — nothing here throws to the UI.
class SocketService {
  io.Socket? _socket;

  void connect({String? token, String? school}) {
    try {
      _socket = io.io(
        ApiConfig.socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setExtraHeaders({
              if (token != null) 'Authorization': 'Bearer $token',
              if (school != null) 'x-tenant-subdomain': school,
            })
            .build(),
      );
      _socket?.connect();
    } catch (_) {/* socket optional */}
  }

  void on(String event, void Function(dynamic) handler) => _socket?.on(event, handler);
  void off(String event) => _socket?.off(event);

  void dispose() {
    try { _socket?.dispose(); } catch (_) {}
    _socket = null;
  }
}
