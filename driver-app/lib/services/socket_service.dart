import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants/app_constants.dart';

/// Real-time channel for dispatch → driver events (route changes, SOS ack, etc.).
class SocketService {
  io.Socket? _socket;

  void connect(String token) {
    _socket = io.io(
      ApiConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .build(),
    );
    _socket!.connect();
  }

  void on(String event, void Function(dynamic) handler) => _socket?.on(event, handler);
  void emit(String event, dynamic data) => _socket?.emit(event, data);
  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}
