import '../client.dart';
import '../models.dart';

class ChargesResource {
  final Malipo client;

  ChargesResource(this.client);

  Future<MalipoTransaction> create(ChargeCreateParams params, {String? idempotencyKey}) async {
    final headers = <String, String>{};
    if (idempotencyKey != null) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    final response = await client.request(
      'POST',
      '/charge',
      data: params.toJson(),
      headers: headers,
    );

    return MalipoTransaction.fromJson(response);
  }
}
