from typing import TypedDict, List, Optional, Any, Literal

MalipoNetwork = Literal["VODACOM_MPESA", "AIRTEL_MONEY", "ORANGE_MONEY"]
MalipoTransactionStatus = Literal["pending", "succeeded", "failed", "expired"]
MalipoEnvironment = Literal["sandbox", "live"]

class MalipoConfig(TypedDict):
    api_key: str
    environment: Optional[MalipoEnvironment]
    base_url: Optional[str]

class ChargeCreateParams(TypedDict, total=False):
    amount: float
    currency: str
    phone: str
    network: MalipoNetwork
    description: Optional[str]
    metadata: Optional[dict]

class MalipoTransaction(TypedDict):
    id: str
    object: Literal["transaction"]
    amount: float
    currency: str
    status: MalipoTransactionStatus
    phone: str
    network: MalipoNetwork
    environment: MalipoEnvironment
    metadata: dict
    created_at: str
    updated_at: str
    failure_reason: Optional[str]
    failure_code: Optional[str]

class MalipoBalanceAmount(TypedDict):
    amount: float
    currency: str

class MalipoBalance(TypedDict):
    object: Literal["balance"]
    available: List[MalipoBalanceAmount]
    pending: List[MalipoBalanceAmount]
    updated_at: str

class MalipoEvent(TypedDict):
    id: str
    object: Literal["event"]
    type: str
    environment: MalipoEnvironment
    data: dict # contains object: MalipoTransaction
    created_at: str
