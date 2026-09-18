import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:test/test.dart';
import 'package:malipo/malipo.dart';

void main() {
  group('Malipo SDK Tests', () {
    test('Environment inferred correctly for live key', () {
      final client = Malipo(apiKey: 'sk_live_123');
      expect(client.environment, equals('live'));
    });

    test('Environment inferred correctly for test key', () {
      final client = Malipo(apiKey: 'sk_test_123');
      expect(client.environment, equals('sandbox'));
    });

    test('Explicit environment overrides inferred', () {
      final client = Malipo(apiKey: 'sk_test_123', environment: 'live');
      expect(client.environment, equals('live'));
    });

    test('ChargeCreateParams serializes correctly', () {
      final params = ChargeCreateParams(
        amount: 10.0,
        currency: 'USD',
        phone: '+243858561278',
        network: MalipoNetwork.orangeMoney,
        description: 'Order #123',
        payer: MalipoPayer(
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        ),
      );

      final json = params.toJson();
      expect(json['amount'], equals(10.0));
      expect(json['currency'], equals('USD'));
      expect(json['phone'], equals('+243858561278'));
      expect(json['network'], equals('ORANGE_MONEY'));
      expect(json['description'], equals('Order #123'));
      expect(json['payer']['first_name'], equals('John'));
      expect(json['payer']['email'], equals('john.doe@example.com'));
    });

    test('RefundCreateParams serializes correctly', () {
      final params = RefundCreateParams(
        chargeId: 'ch_123',
        amount: 5.0,
        reason: 'Requested by user',
      );

      final json = params.toJson();
      expect(json['charge_id'], equals('ch_123'));
      expect(json['amount'], equals(5.0));
      expect(json['reason'], equals('Requested by user'));
    });

    test('CheckoutSessionCreateParams serializes correctly', () {
      final params = CheckoutSessionCreateParams(
        amount: 25.0,
        currency: 'USD',
        description: 'Monthly sub',
        redirectUrl: 'https://example.com/ok',
      );

      final json = params.toJson();
      expect(json['amount'], equals(25.0));
      expect(json['currency'], equals('USD'));
      expect(json['description'], equals('Monthly sub'));
      expect(json['redirect_url'], equals('https://example.com/ok'));
    });

    test('MalipoRefund deserializes correctly', () {
      final json = {
        'id': 're_123',
        'object': 'refund',
        'amount': 5.0,
        'currency': 'USD',
        'requested_currency': 'USD',
        'status': 'succeeded',
        'phone': '+243810000000',
        'network': 'VODACOM_MPESA',
        'environment': 'live',
        'created_at': '2026-06-15T12:00:00Z',
      };

      final refund = MalipoRefund.fromJson(json);
      expect(refund.id, equals('re_123'));
      expect(refund.amount, equals(5.0));
      expect(refund.status, equals(MalipoTransactionStatus.succeeded));
      expect(refund.network, equals(MalipoNetwork.vodacomMpesa));
    });

    test('MalipoCheckoutSession deserializes correctly', () {
      final json = {
        'id': 'cs_123',
        'object': 'checkout_session',
        'token': 'tok_123',
        'url': 'https://checkout.malipo.dev/tok_123',
        'amount': 25.0,
        'currency': 'USD',
        'status': 'active',
        'environment': 'live',
        'expires_at': '2026-06-16T12:00:00Z',
        'created_at': '2026-06-15T12:00:00Z',
      };

      final session = MalipoCheckoutSession.fromJson(json);
      expect(session.id, equals('cs_123'));
      expect(session.token, equals('tok_123'));
      expect(session.url, contains('tok_123'));
      expect(session.status, equals('active'));
    });
  });

  group('Webhook signature verification', () {
    // Published in malipo-sdks/samples/webhook-test-vectors.md. The signature is
    // asserted as a literal so the shared contract across every SDK cannot drift.
    const vectorSecret = 'whsec_example_only';
    const vectorTimestamp = '2026-09-18T07:30:00.000Z';
    const vectorBody =
        '{"id": "evt_test_1234567890abcdef", "object": "event", "type": "charge.succeeded", "environment": "sandbox", "created_at": "2026-09-18T07:29:58.000Z", "data": {"object": {"id": "tx_12345", "object": "transaction", "amount": 50, "currency": "USD", "requested_currency": "USD", "status": "succeeded", "phone": "+243831386749", "network": "VODACOM_MPESA", "environment": "sandbox", "metadata": {}, "created_at": "2026-09-18T07:29:58.000Z"}}}';
    const vectorSignature = '457fada06ad0a706baee51fb3a6cb06bcdc179c95c82c24bafe17fb90fe4d343';
    const vectorLegacySignature = '53878fca703f5121a9e19a31edf7bbd5d28e1ce734bc0e9211d8e7715780658a';

    final webhooks = Malipo(apiKey: 'sk_test_123').webhooks;

    String sign(String message) =>
        Hmac(sha256, utf8.encode(vectorSecret)).convert(utf8.encode(message)).toString();

    test('accepts the published timestamped vector', () {
      final event = webhooks.constructEvent(
        vectorBody,
        vectorSignature,
        vectorSecret,
        vectorTimestamp,
        0,
      );

      expect(event.id, equals('evt_test_1234567890abcdef'));
      expect(event.type, equals('charge.succeeded'));
      expect(event.data.object.id, equals('tx_12345'));
    });

    test('rejects a live delivery when verified without the timestamp', () {
      expect(
        () => webhooks.constructEvent(vectorBody, vectorSignature, vectorSecret),
        throwsA(predicate((e) => e.toString().contains('Invalid webhook signature'))),
      );
    });

    test('still accepts the legacy body-only scheme', () {
      final event = webhooks.constructEvent(vectorBody, vectorLegacySignature, vectorSecret);

      expect(event.id, equals('evt_test_1234567890abcdef'));
    });

    test('accepts a fresh timestamp with the default window', () {
      final timestamp = DateTime.now().toUtc().toIso8601String();

      final event = webhooks.constructEvent(
        vectorBody,
        sign('$timestamp.$vectorBody'),
        vectorSecret,
        timestamp,
      );

      expect(event.id, equals('evt_test_1234567890abcdef'));
    });

    test('rejects a stale timestamp', () {
      const stale = '2020-01-01T00:00:00.000Z';

      expect(
        () => webhooks.constructEvent(
          vectorBody,
          sign('$stale.$vectorBody'),
          vectorSecret,
          stale,
        ),
        throwsA(predicate((e) => e.toString().contains('Webhook timestamp out of window'))),
      );
    });

    test('rejects an unparseable timestamp', () {
      const epochSeconds = '1758171000';

      expect(
        () => webhooks.constructEvent(
          vectorBody,
          sign('$epochSeconds.$vectorBody'),
          vectorSecret,
          epochSeconds,
        ),
        throwsA(predicate((e) => e.toString().contains('Webhook timestamp out of window'))),
      );
    });

    test('rejects a tampered body', () {
      expect(
        () => webhooks.constructEvent(
          '$vectorBody ',
          vectorSignature,
          vectorSecret,
          vectorTimestamp,
          0,
        ),
        throwsA(predicate((e) => e.toString().contains('Invalid webhook signature'))),
      );
    });
  });
}
