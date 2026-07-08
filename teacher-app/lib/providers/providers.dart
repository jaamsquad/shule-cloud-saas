import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/auth_repository.dart';
import '../repositories/data_repository.dart';
import '../services/api_client.dart';
import '../services/connectivity_service.dart';
import '../services/notification_service.dart';
import '../services/storage_service.dart';

final storageProvider = Provider<StorageService>((ref) => StorageService());

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.read(storageProvider)));

final dioProvider = Provider<Dio>((ref) => ref.read(apiClientProvider).dio);

final authRepoProvider = Provider<AuthRepository>((ref) => AuthRepository(ref.read(dioProvider), ref.read(storageProvider)));

final dataRepoProvider = Provider<DataRepository>((ref) => DataRepository(ref.read(dioProvider)));

final connectivityProvider = Provider<ConnectivityService>((ref) => ConnectivityService());

final onlineStatusProvider = StreamProvider<bool>((ref) => ref.read(connectivityProvider).onlineStream);

final notificationServiceProvider = Provider<NotificationService>((ref) => NotificationService());
