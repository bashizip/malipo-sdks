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
}
