import '../client.dart';
import '../models.dart';

class RefundsResource {
  final Malipo client;

  RefundsResource(this.client);

  Future<MalipoRefund> create(RefundCreateParams params, {String? idempotencyKey}) async {
    final headers = <String, String>{};
    if (idempotencyKey != null) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    final response = await client.request(
      'POST',
      '/refund',
      data: params.toJson(),
      headers: headers,
    );

    return MalipoRefund.fromJson(response);
  }
}
