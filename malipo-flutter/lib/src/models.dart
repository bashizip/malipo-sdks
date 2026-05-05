enum MalipoNetwork {
  vodacomMpesa('VODACOM_MPESA'),
  airtelMoney('AIRTEL_MONEY'),
  orangeMoney('ORANGE_MONEY');

  final String value;
  const MalipoNetwork(this.value);

  factory MalipoNetwork.fromValue(String value) {
    return values.firstWhere(
      (e) => e.value == value,
      orElse: () => throw ArgumentError('Invalid network value: $value'),
    );
  }
}

enum MalipoTransactionStatus {
  pending('pending'),
  succeeded('succeeded'),
  failed('failed'),
  expired('expired');

  final String value;
  const MalipoTransactionStatus(this.value);

  factory MalipoTransactionStatus.fromValue(String value) {
    return values.firstWhere(
      (e) => e.value == value,
      orElse: () => throw ArgumentError('Invalid status value: $value'),
    );
  }
}

class MalipoPayer {
  final String firstName;
  final String lastName;
  final String email;

  MalipoPayer({
    required this.firstName,
    required this.lastName,
    required this.email,
  });

  Map<String, dynamic> toJson() {
    return {
      'first_name': firstName,
      'last_name': lastName,
      'email': email,
    };
  }
}

class ChargeCreateParams {
  final double amount;
  final String currency;
  final String phone;
  final MalipoNetwork network;
  final String? description;
  final Map<String, dynamic>? metadata;
  final MalipoPayer? payer;

  ChargeCreateParams({
    required this.amount,
    required this.currency,
    required this.phone,
    required this.network,
    this.description,
    this.metadata,
    this.payer,
  });

  Map<String, dynamic> toJson() {
    final data = <String, dynamic>{
      'amount': amount,
      'currency': currency,
      'phone': phone,
      'network': network.value,
    };

    if (description != null) data['description'] = description;
    if (metadata != null) data['metadata'] = metadata;
    if (payer != null) data['payer'] = payer!.toJson();

    return data;
  }
}

class MalipoTransaction {
  final String id;
  final String object;
  final double amount;
  final String currency;
  final MalipoTransactionStatus status;
  final String phone;
  final MalipoNetwork network;
  final String environment;
  final Map<String, dynamic> metadata;
  final String createdAt;
  final String? updatedAt;
  final String? failureReason;
  final String? failureCode;

  MalipoTransaction({
    required this.id,
    required this.object,
    required this.amount,
    required this.currency,
    required this.status,
    required this.phone,
    required this.network,
    required this.environment,
    required this.metadata,
    required this.createdAt,
    this.updatedAt,
    this.failureReason,
    this.failureCode,
  });

  factory MalipoTransaction.fromJson(Map<String, dynamic> json) {
    return MalipoTransaction(
      id: json['id'],
      object: json['object'] ?? 'transaction',
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] ?? json['requested_currency'] ?? 'USD',
      status: MalipoTransactionStatus.fromValue(json['status']),
      phone: json['phone'],
      network: MalipoNetwork.fromValue(json['network']),
      environment: json['environment'] ?? 'live',
      metadata: json['metadata'] ?? {},
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
      failureReason: json['failure_reason'],
      failureCode: json['failure_code'],
    );
  }
}

class MalipoBalanceAmount {
  final double amount;
  final String currency;

  MalipoBalanceAmount({
    required this.amount,
    required this.currency,
  });

  factory MalipoBalanceAmount.fromJson(Map<String, dynamic> json) {
    return MalipoBalanceAmount(
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'],
    );
  }
}

class MalipoBalance {
  final String object;
  final List<MalipoBalanceAmount> available;
  final List<MalipoBalanceAmount> pending;
  final String updatedAt;

  MalipoBalance({
    required this.object,
    required this.available,
    required this.pending,
    required this.updatedAt,
  });

  factory MalipoBalance.fromJson(Map<String, dynamic> json) {
    var availList = json['available'] as List? ?? [];
    var pendingList = json['pending'] as List? ?? [];

    return MalipoBalance(
      object: json['object'] ?? 'balance',
      available: availList.map((e) => MalipoBalanceAmount.fromJson(e)).toList(),
      pending: pendingList.map((e) => MalipoBalanceAmount.fromJson(e)).toList(),
      updatedAt: json['updated_at'],
    );
  }
}

class MalipoEventData {
  final MalipoTransaction object;

  MalipoEventData({required this.object});

  factory MalipoEventData.fromJson(Map<String, dynamic> json) {
    return MalipoEventData(
      object: MalipoTransaction.fromJson(json['object']),
    );
  }
}

class MalipoEvent {
  final String id;
  final String object;
  final String type;
  final String environment;
  final MalipoEventData data;
  final String createdAt;

  MalipoEvent({
    required this.id,
    required this.object,
    required this.type,
    required this.environment,
    required this.data,
    required this.createdAt,
  });

  factory MalipoEvent.fromJson(Map<String, dynamic> json) {
    return MalipoEvent(
      id: json['id'],
      object: json['object'] ?? 'event',
      type: json['type'],
      environment: json['environment'],
      data: MalipoEventData.fromJson(json['data']),
      createdAt: json['created_at'],
    );
  }
}
