import os

from malipo import Malipo


def main():
    # Using the live API key from the Java sample
    api_key = os.getenv("MALIPO_API_KEY", "sk_live_YOUR_API_KEY_HERE")
    malipo = Malipo(api_key=api_key)

    print("Initiating charge...")
    try:
        # Create a charge with the same parameters as the Java sample
        charge = malipo.charges.create(
            {
                "amount": 10.0,
                "currency": "USD",
                "phone": "+243858561278",
                "network": "ORANGE_MONEY",
                "description": "Order #123",
                "payer": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john.doe@example.com",
                },
            },
            idempotency_key="unique_order_id_125",
        )

        print("Charge initiated successfully!")
        print(f"Charge ID: {charge.get('id')}")
        print(f"Status: {charge.get('status')}")

    except Exception as e:
        print(f"Charge failed: {e}")


if __name__ == "__main__":
    main()
