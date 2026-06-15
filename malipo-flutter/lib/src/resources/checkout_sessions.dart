import '../client.dart';
import '../models.dart';

class CheckoutSessionsResource {
  final Malipo client;

  CheckoutSessionsResource(this.client);

  Future<MalipoCheckoutSession> create(CheckoutSessionCreateParams params) async {
    final response = await client.request(
      'POST',
      '/checkout-session',
      data: params.toJson(),
    );

    return MalipoCheckoutSession.fromJson(response);
  }
}
