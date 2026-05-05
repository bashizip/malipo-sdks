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
  });
}
