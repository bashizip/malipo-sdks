package com.malipo.sample;

import com.malipo.Malipo;
import com.malipo.models.*;

/**
 * Hello world!
 */
public class Main {

    public static void main(String[] args) {
        Malipo malipo = new Malipo(System.getenv("MALIPO_API_KEY") != null
            ? System.getenv("MALIPO_API_KEY")
            : "sk_live_YOUR_API_KEY_HERE");

        // Create a charge
        try {
            ChargeCreateParams params = ChargeCreateParams.builder()
                .amount(10.0)
                .currency("USD")
                .phone("+243858561278")
                .network(MalipoNetwork.ORANGE_MONEY)
                .description("Order #123")
                .payer(new MalipoPayer("John", "Doe", "john.doe@example.com"))
                .build();

            MalipoTransaction charge = malipo.charges.create(
                params,
                "unique_order_id_124"
            );

            System.out.println("Charge initiated: " + charge.getId());
            System.out.println("Status: " + charge.getStatus()); // "pending"
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
