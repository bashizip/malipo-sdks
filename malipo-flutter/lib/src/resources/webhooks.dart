import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../models.dart';

class WebhooksResource {
  MalipoEvent constructEvent(String payload, String signature, String secret) {
    if (payload.isEmpty || signature.isEmpty || secret.isEmpty) {
      throw ArgumentError('Missing payload, signature, or secret for webhook verification.');
    }

    final hmac = Hmac(sha256, utf8.encode(secret));
    final digest = hmac.convert(utf8.encode(payload));
    final expectedSignature = digest.toString();

    if (expectedSignature != signature) {
      throw Exception('Invalid webhook signature.');
    }

    try {
      final decodedPayload = jsonDecode(payload) as Map<String, dynamic>;
      return MalipoEvent.fromJson(decodedPayload);
    } catch (e) {
      throw Exception('Failed to decode webhook payload: $e');
    }
  }
}
