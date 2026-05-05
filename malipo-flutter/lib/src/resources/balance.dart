import '../client.dart';
import '../models.dart';

class BalanceResource {
  final Malipo client;

  BalanceResource(this.client);

  Future<MalipoBalance> retrieve() async {
    final endpoint = client.environment == 'live' ? '/live-balance' : '/sandbox-balance';
    final response = await client.request('GET', endpoint);

    return MalipoBalance.fromJson(response);
  }
}
