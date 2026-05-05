import '../client.dart';
import '../models.dart';

class TransactionsResource {
  final Malipo client;

  TransactionsResource(this.client);

  Future<MalipoTransaction> retrieve(String id) async {
    final response = await client.request(
      'GET',
      '/transaction-status?id=$id',
    );

    return MalipoTransaction.fromJson(response);
  }
}
