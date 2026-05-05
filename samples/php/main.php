<?php

require_once __DIR__ . '/vendor/autoload.php';

use Malipo\Malipo;

// Replace with your actual API key, or set it in the environment
$apiKey = getenv('MALIPO_API_KEY') ?: 'sk_live_YOUR_API_KEY_HERE';

$malipo = new Malipo($apiKey);

echo "Initiating charge...\n";

try {
    // Create a charge with the same parameters as the other samples
    $charge = $malipo->charges->create(
        [
            'amount' => 10.0,
            'currency' => 'USD',
            'phone' => '+243858561278',
            'network' => 'ORANGE_MONEY',
            'description' => 'Order #123',
            'payer' => [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john.doe@example.com'
            ]
        ],
        ['idempotencyKey' => 'unique_order_id_124'] // Options array
    );

    echo "Charge initiated successfully!\n";
    echo "Charge ID: " . $charge['id'] . "\n";
    echo "Status: " . $charge['status'] . "\n";

} catch (\Exception $e) {
    echo "Charge failed: " . $e->getMessage() . "\n";
}
