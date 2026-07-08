/// Friendly, typed failures surfaced to the UI.
sealed class Failure {
  final String message;
  const Failure(this.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection. Showing saved data where available.']);
}

class ServerFailure extends Failure {
  const ServerFailure([super.message = 'The school server is unavailable right now. Please try again shortly.']);
}

class AuthFailure extends Failure {
  const AuthFailure([super.message = 'Your session expired. Please sign in again.']);
}

class NotFoundFailure extends Failure {
  const NotFoundFailure([super.message = 'Not available yet.']);
}

class UnknownFailure extends Failure {
  const UnknownFailure([super.message = 'Something went wrong. Please try again.']);
}
