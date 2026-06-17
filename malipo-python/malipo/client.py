import json
import hmac
import hashlib
import requests
from typing import Optional, Any, Dict
from .types import (
    MalipoEnvironment, 
    MalipoTransaction, 
    MalipoBalance, 
    ChargeCreateParams,
    MalipoEvent
)
from .errors import MalipoError

class Malipo:
    def __init__(self, api_key: str, environment: Optional[MalipoEnvironment] = None, base_url: Optional[str] = None):
        if not api_key:
            raise ValueError("Malipo API Key is required.")
        
        self.api_key = api_key
        
        # Infer environment from API Key if not explicitly provided
        if environment:
            self.environment = environment
        else:
            self.environment = "live" if api_key.startswith("sk_live_") else "sandbox"
            
        self.base_url = base_url or "https://api.malipo.dev/v1"
        
        # Initialize resources
        self.charges = ChargesResource(self)
        self.transactions = TransactionsResource(self)
        self.balance = BalanceResource(self)
        self.webhooks = WebhooksResource()

    def request(self, method: str, endpoint: str, params: Optional[Dict] = None, headers: Optional[Dict] = None):
        url = f"{self.base_url}{endpoint}"
        
        default_headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Client-Info": "malipo-python/1.0.1"
        }
        if headers:
            default_headers.update(headers)
            
        try:
            response = requests.request(
                method=method,
                url=url,
                json=params if method == "POST" else None,
                params=params if method == "GET" else None,
                headers=default_headers
            )
            
            try:
                data = response.json()
            except json.JSONDecodeError:
                data = response.text
            
            if not response.ok:
                error_data = data if isinstance(data, dict) else {}
                error_payload = error_data.get("error", {})
                raise MalipoError(
                    message=error_payload.get("message", data if isinstance(data, str) and data else "An unexpected error occurred"),
                    status_code=response.status_code,
                    code=error_payload.get("code"),
                    details=error_payload if error_payload else error_data
                )
                
            return data
            
        except requests.exceptions.RequestException as e:
            if isinstance(e, MalipoError):
                raise e
            raise MalipoError(f"Network error: {str(e)}")

class ChargesResource:
    def __init__(self, client: Malipo):
        self.client = client

    def create(self, params: ChargeCreateParams, idempotency_key: Optional[str] = None) -> MalipoTransaction:
        headers = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        return self.client.request("POST", "/charge", params, headers)

class TransactionsResource:
    def __init__(self, client: Malipo):
        self.client = client

    def retrieve(self, transaction_id: str) -> MalipoTransaction:
        return self.client.request("GET", "/transaction-status", {"id": transaction_id})

class BalanceResource:
    def __init__(self, client: Malipo):
        self.client = client

    def retrieve(self) -> MalipoBalance:
        endpoint = "/live-balance" if self.client.environment == "live" else "/sandbox-balance"
        return self.client.request("GET", endpoint)

class WebhooksResource:
    def construct_event(self, payload: str, signature: str, secret: str) -> MalipoEvent:
        if not payload or not signature or not secret:
            raise ValueError("Missing payload, signature, or secret for webhook verification.")
            
        expected_signature = hmac.new(
            secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, signature):
            raise MalipoError("Invalid webhook signature.")
            
        return json.loads(payload)
