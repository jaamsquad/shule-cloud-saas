/// Typed failures surfaced to the UI as friendly messages.
sealed class Failure {
  final String message;
  const Failure(this.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection. Your work will sync when you are back online.']);
}

class ServerFailure extends Failure {
  const ServerFailure([super.message = 'The server is unavailable right now. Please try again shortly.']);
}

class AuthFailure extends Failure {
  const AuthFailure([super.message = 'Your session has expired. Please sign in again.']);
}

class PermissionFailure extends Failure {
  const PermissionFailure([super.message = 'A required permission was denied. Enable it in Settings to continue.']);
}

class LocationFailure extends Failure {
  const LocationFailure([super.message = 'GPS is unavailable. Check your device location settings.']);
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}

class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Something went wrong. Please try again.']);
}
