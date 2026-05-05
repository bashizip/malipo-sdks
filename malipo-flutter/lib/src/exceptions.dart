class MalipoException implements Exception {
  final String message;
  final int statusCode;
  final String? errorCode;
  final Map<String, dynamic>? details;

  MalipoException({
    required this.message,
    required this.statusCode,
    this.errorCode,
    this.details,
  });

  @override
  String toString() {
    return 'MalipoException(message: $message, statusCode: $statusCode, errorCode: $errorCode, details: $details)';
  }
}
