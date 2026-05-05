import 'dart:io';
import 'package:malipo/malipo.dart';

void main() async {
  // Using the live API key from the other samples
  final apiKey = Platform.environment['MALIPO_API_KEY'] ??
      'sk_live_YOUR_API_KEY_HERE';
  final malipo = Malipo(apiKey: apiKey);

  print('Initiating charge...');
  try {
    // Create a charge with the same parameters
    final charge = await malipo.charges.create(
      ChargeCreateParams(
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
      ),
      idempotencyKey: 'unique_order_id_127',
    );

    print('Charge initiated successfully!');
    print('Charge ID: ${charge.id}');
    print('Status: ${charge.status.value}');
  } catch (e) {
    print('Charge failed: $e');
  } finally {
    malipo.close();
  }
}
