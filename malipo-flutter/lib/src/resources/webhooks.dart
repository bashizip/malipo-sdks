import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../models.dart';

/// Default replay-protection window, mirroring the Node SDK (5 minutes).
const int _defaultToleranceMs = 300000;

class WebhooksResource {
  /// Verify a webhook signature and return the decoded event.
  ///
  /// The signed message is `<timestamp>.<payload>`: the timestamp is prefixed to the
  /// exact raw body with a literal dot, matching the Node SDK. When [timestamp] is
  /// omitted the legacy body-only scheme is used.
  ///
  /// [payload] is the raw request body, exactly as received. Do not re-serialize it.
  /// [signature] is the value of the `X-Webhook-Signature` header.
  /// [secret] is your webhook signing secret (64 hex characters, no prefix).
  /// [timestamp] is the value of the `X-Webhook-Timestamp` header. Required for
  /// deliveries signed with the timestamp scheme.
  /// [toleranceMs] is the replay-protection window in milliseconds (default 300000,
  /// i.e. 5 minutes). Set to 0 to disable the check, for example when verifying a
  /// frozen test vector.
  MalipoEvent constructEvent(
    String payload,
    String signature,
    String secret, [
    String? timestamp,
    int toleranceMs = _defaultToleranceMs,
  ]) {
    if (payload.isEmpty || signature.isEmpty || secret.isEmpty) {
      throw ArgumentError('Missing payload, signature, or secret for webhook verification.');
    }

    final hasTimestamp = timestamp != null && timestamp.isNotEmpty;

    if (hasTimestamp && toleranceMs > 0) {
      final signedAt = DateTime.tryParse(timestamp);

      if (signedAt == null ||
          DateTime.now().toUtc().difference(signedAt.toUtc()).inMilliseconds.abs() > toleranceMs) {
        throw Exception('Webhook timestamp out of window.');
      }
    }

    final signedPayload = hasTimestamp ? '$timestamp.$payload' : payload;
    final expectedSignature =
        Hmac(sha256, utf8.encode(secret)).convert(utf8.encode(signedPayload)).toString();

    if (!_constantTimeEquals(expectedSignature, signature)) {
      throw Exception('Invalid webhook signature.');
    }

    try {
      final decodedPayload = jsonDecode(payload) as Map<String, dynamic>;
      return MalipoEvent.fromJson(decodedPayload);
    } catch (e) {
      throw Exception('Failed to decode webhook payload: $e');
    }
  }

  /// Length-safe comparison that does not short-circuit on the first differing byte.
  static bool _constantTimeEquals(String expected, String provided) {
    final expectedBytes = utf8.encode(expected);
    final providedBytes = utf8.encode(provided);

    if (expectedBytes.length != providedBytes.length) {
      return false;
    }

    var difference = 0;
    for (var i = 0; i < expectedBytes.length; i++) {
      difference |= expectedBytes[i] ^ providedBytes[i];
    }

    return difference == 0;
  }
}
