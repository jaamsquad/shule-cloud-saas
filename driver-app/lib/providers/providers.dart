import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';
import '../services/location_service.dart';
import '../services/connectivity_service.dart';
import '../services/gps_queue.dart';
import '../services/tracking_uploader.dart';
import '../services/socket_service.dart';
import '../services/notification_service.dart';
import '../repositories/auth_repository.dart';
import '../repositories/trip_repository.dart';
import '../repositories/student_repository.dart';
import '../repositories/safety_repository.dart';

/// ── Dependency injection graph (all singletons) ─────────────────────────────
final storageProvider = Provider<StorageService>((ref) => StorageService());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.read(storageProvider)));
final locationServiceProvider = Provider<LocationService>((ref) => LocationService());
final connectivityProvider = Provider<ConnectivityService>((ref) => ConnectivityService());
final gpsQueueProvider = Provider<GpsQueue>((ref) => GpsQueue());
final socketProvider = Provider<SocketService>((ref) => SocketService());
final notificationServiceProvider = Provider<NotificationService>((ref) => NotificationService());

final trackingUploaderProvider = Provider<TrackingUploader>(
  (ref) => TrackingUploader(ref.read(apiClientProvider).dio, ref.read(gpsQueueProvider)),
);

/// ── Repositories ─────────────────────────────────────────────────────────────
final authRepoProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.read(apiClientProvider).dio, ref.read(storageProvider)),
);
final tripRepoProvider = Provider<TripRepository>(
  (ref) => TripRepository(ref.read(apiClientProvider).dio),
);
final studentRepoProvider = Provider<StudentRepository>(
  (ref) => StudentRepository(ref.read(apiClientProvider).dio),
);
final safetyRepoProvider = Provider<SafetyRepository>(
  (ref) => SafetyRepository(ref.read(apiClientProvider).dio),
);

/// Online/offline stream — drives the offline banner and queue flush.
final onlineStatusProvider = StreamProvider<bool>(
  (ref) => ref.read(connectivityProvider).onlineStream,
);
