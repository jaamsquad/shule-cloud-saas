import '../error/failures.dart';

/// A lightweight Result type — success value or a typed [Failure].
sealed class Result<T> {
  const Result();
  R when<R>({required R Function(T value) success, required R Function(Failure failure) failure}) {
    final self = this;
    if (self is Success<T>) return success(self.value);
    return failure((self as Err<T>).failure);
  }

  bool get isSuccess => this is Success<T>;
  T? get valueOrNull => this is Success<T> ? (this as Success<T>).value : null;
}

class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);
}

class Err<T> extends Result<T> {
  final Failure failure;
  const Err(this.failure);
}
