import 'dart:convert';
import 'package:http/http.dart' as http;
import 'exceptions.dart';
import 'resources/charges.dart';
import 'resources/transactions.dart';
import 'resources/balance.dart';
import 'resources/webhooks.dart';

class Malipo {
  final String apiKey;
  final String environment;
  final String baseUrl;
  final http.Client _client = http.Client();

  late final ChargesResource charges;
  late final TransactionsResource transactions;
  late final BalanceResource balance;
  late final WebhooksResource webhooks;

  Malipo({required this.apiKey, String? environment, String? baseUrl})
    : environment =
          environment ?? (apiKey.startsWith('sk_live_') ? 'live' : 'sandbox'),
      baseUrl =
          baseUrl ?? 'https://api.malipo.dev' {
    if (apiKey.isEmpty) {
      throw ArgumentError('Malipo API Key is required.');
    }

    charges = ChargesResource(this);
    transactions = TransactionsResource(this);
    balance = BalanceResource(this);
    webhooks = WebhooksResource();
  }

  Future<Map<String, dynamic>> request(
    String method,
    String endpoint, {
    Map<String, dynamic>? data,
    Map<String, String>? headers,
  }) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final reqHeaders = {
      'Authorization': 'Bearer $apiKey',
      'Content-Type': 'application/json',
      'X-Client-Info': 'malipo-flutter/1.0.0',
      ...?headers,
    };

    http.Response response;

    try {
      if (method.toUpperCase() == 'POST') {
        response = await _client.post(
          uri,
          headers: reqHeaders,
          body: data != null ? jsonEncode(data) : null,
        );
      } else if (method.toUpperCase() == 'GET') {
        // Query parameters should be handled in the endpoint string or parsed URI
        response = await _client.get(uri, headers: reqHeaders);
      } else {
        throw ArgumentError('Unsupported HTTP method: $method');
      }

      final responseBody = response.body.isNotEmpty
          ? jsonDecode(response.body)
          : {};

      if (response.statusCode >= 400) {
        final errorData = responseBody['error'] ?? {};
        final Map<String, dynamic> errorMap = errorData is Map
            ? Map<String, dynamic>.from(errorData)
            : {'message': errorData.toString()};

        throw MalipoException(
          message: errorMap['message'] ?? 'An unexpected error occurred',
          statusCode: response.statusCode,
          errorCode: errorMap['code']?.toString(),
          details: errorMap,
        );
      }

      return responseBody is Map ? Map<String, dynamic>.from(responseBody) : {};
    } catch (e) {
      if (e is MalipoException) {
        rethrow;
      }
      throw MalipoException(
        message: 'Failed to execute Malipo API request: $e',
        statusCode: 500,
        details: {'error': e.toString()},
      );
    }
  }

  void close() {
    _client.close();
  }
}
