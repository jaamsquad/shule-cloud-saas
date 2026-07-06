import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../services/connectivity_service.dart';
import '../services/notification_service.dart';
import '../services/socket_service.dart';
import '../services/storage_service.dart';
import '../repositories/auth_repository.dart';
import '../repositories/data_repository.dart';

// ── Services ───────────────────────────────────────────────────────────────
final storageProvider = Provider<StorageService>((ref) => StorageService());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.read(storageProvider)));
final connectivityProvider = Provider<ConnectivityService>((ref) => ConnectivityService());
final socketProvider = Provider<SocketService>((ref) => SocketService());
final notificationServiceProvider = Provider<NotificationService>((ref) => NotificationService());

// ── Repositories ───────────────────────────────────────────────────────────
final authRepoProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.read(apiClientProvider).dio, ref.read(storageProvider)),
);
final dataRepoProvider = Provider<DataRepository>(
  (ref) => DataRepository(ref.read(apiClientProvider).dio, ref.read(storageProvider)),
);

// ── Connectivity ───────────────────────────────────────────────────────────
final onlineStatusProvider = StreamProvider<bool>((ref) => ref.read(connectivityProvider).onlineStream);
