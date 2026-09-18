<?php

namespace Malipo\Tests;

use PHPUnit\Framework\TestCase;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use Malipo\Malipo;
use Malipo\Exceptions\MalipoException;

class MalipoTest extends TestCase
{
    private function getMockClient(array $responses = [])
    {
        $mock = new MockHandler($responses);
        $handlerStack = HandlerStack::create($mock);

        $client = new Malipo('sk_test_123');

        // Use reflection to set the private Guzzle client with the mock handler
        $reflection = new \ReflectionClass($client);
        $property = $reflection->getProperty('client');
        $property->setAccessible(true);

        $guzzleClient = new \GuzzleHttp\Client(['handler' => $handlerStack]);
        $property->setValue($client, $guzzleClient);

        return $client;
    }

    public function test_create_charge()
    {
        $client = $this->getMockClient([
            new Response(200, [], json_encode(['id' => 'tx_123', 'status' => 'pending']))
        ]);

        $charge = $client->charges->create([
            'amount' => 10,
            'currency' => 'USD',
            'phone' => '243810000000',
            'network' => 'VODACOM_MPESA'
        ], ['idempotencyKey' => 'idemp_123']);

        $this->assertEquals('tx_123', $charge['id']);
    }

    public function test_retrieve_transaction()
    {
        $client = $this->getMockClient([
            new Response(200, [], json_encode(['id' => 'tx_123', 'status' => 'succeeded']))
        ]);

        $tx = $client->transactions->retrieve('tx_123');
        $this->assertEquals('succeeded', $tx['status']);
    }

    public function test_error_handling()
    {
        $client = $this->getMockClient([
            new Response(400, [], json_encode([
                'error' => ['message' => 'Invalid amount', 'code' => 'invalid_amount']
            ]))
        ]);

        $this->expectException(MalipoException::class);
        $this->expectExceptionMessage('Invalid amount');

        $client->charges->create(['amount' => -1]);
    }

    public function test_webhook_verification()
    {
        $client = new Malipo('sk_test_123');
        $payload = json_encode(['id' => 'evt_123', 'type' => 'charge.succeeded']);
        $secret = 'whsec_test';
        $signature = hash_hmac('sha256', $payload, $secret);

        $event = $client->webhooks->constructEvent($payload, $signature, $secret);
        $this->assertEquals('evt_123', $event['id']);
        $this->assertEquals('charge.succeeded', $event['type']);
    }

    public function test_webhook_verification_failure()
    {
        $client = new Malipo('sk_test_123');
        $payload = json_encode(['id' => 'evt_123']);
        $secret = 'whsec_test';
        $signature = 'wrong_signature';

        $this->expectException(MalipoException::class);
        $this->expectExceptionMessage('Invalid webhook signature');

        $client->webhooks->constructEvent($payload, $signature, $secret);
    }

    /**
     * Published in malipo-sdks/samples/webhook-test-vectors.md. The signature is asserted
     * as a literal so the shared contract across every SDK cannot drift silently.
     */
    private const VECTOR_SECRET = 'whsec_example_only';
    private const VECTOR_TIMESTAMP = '2026-09-18T07:30:00.000Z';
    private const VECTOR_BODY = '{"id": "evt_test_1234567890abcdef", "object": "event", "type": "charge.succeeded", "environment": "sandbox", "created_at": "2026-09-18T07:29:58.000Z", "data": {"object": {"id": "tx_12345", "object": "transaction", "amount": 50, "currency": "USD", "requested_currency": "USD", "status": "succeeded", "phone": "+243831386749", "network": "VODACOM_MPESA", "environment": "sandbox", "metadata": {}, "created_at": "2026-09-18T07:29:58.000Z"}}}';
    private const VECTOR_SIGNATURE = '457fada06ad0a706baee51fb3a6cb06bcdc179c95c82c24bafe17fb90fe4d343';
    private const VECTOR_LEGACY_SIGNATURE = '53878fca703f5121a9e19a31edf7bbd5d28e1ce734bc0e9211d8e7715780658a';

    private function sign(string $message): string
    {
        return hash_hmac('sha256', $message, self::VECTOR_SECRET);
    }

    public function test_webhook_vector_accepts_the_timestamped_scheme()
    {
        $client = new Malipo('sk_test_123');

        $event = $client->webhooks->constructEvent(
            self::VECTOR_BODY,
            self::VECTOR_SIGNATURE,
            self::VECTOR_SECRET,
            self::VECTOR_TIMESTAMP,
            0
        );

        $this->assertEquals('evt_test_1234567890abcdef', $event['id']);
        $this->assertEquals('charge.succeeded', $event['type']);
        $this->assertEquals('tx_12345', $event['data']['object']['id']);
    }

    public function test_webhook_vector_rejects_a_live_delivery_when_verified_without_the_timestamp()
    {
        $client = new Malipo('sk_test_123');

        $this->expectException(MalipoException::class);
        $this->expectExceptionMessage('Invalid webhook signature');

        $client->webhooks->constructEvent(
            self::VECTOR_BODY,
            self::VECTOR_SIGNATURE,
            self::VECTOR_SECRET
        );
    }

    public function test_webhook_vector_still_accepts_the_legacy_body_only_scheme()
    {
        $client = new Malipo('sk_test_123');

        $event = $client->webhooks->constructEvent(
            self::VECTOR_BODY,
            self::VECTOR_LEGACY_SIGNATURE,
            self::VECTOR_SECRET
        );

        $this->assertEquals('evt_test_1234567890abcdef', $event['id']);
    }

    public function test_webhook_vector_accepts_a_fresh_timestamp_with_the_default_window()
    {
        $client = new Malipo('sk_test_123');
        $timestamp = gmdate('Y-m-d\TH:i:s.000\Z');

        $event = $client->webhooks->constructEvent(
            self::VECTOR_BODY,
            $this->sign($timestamp . '.' . self::VECTOR_BODY),
            self::VECTOR_SECRET,
            $timestamp
        );

        $this->assertEquals('evt_test_1234567890abcdef', $event['id']);
    }

    public function test_webhook_vector_rejects_a_stale_timestamp()
    {
        $client = new Malipo('sk_test_123');
        $stale = '2020-01-01T00:00:00.000Z';

        $this->expectException(MalipoException::class);
        $this->expectExceptionMessage('Webhook timestamp out of window');

        $client->webhooks->constructEvent(
            self::VECTOR_BODY,
            $this->sign($stale . '.' . self::VECTOR_BODY),
            self::VECTOR_SECRET,
            $stale
        );
    }

    public function test_webhook_vector_rejects_an_unparseable_timestamp()
    {
        $client = new Malipo('sk_test_123');
        $epochSeconds = '1758171000';

        $this->expectException(MalipoException::class);
        $this->expectExceptionMessage('Webhook timestamp out of window');

        $client->webhooks->constructEvent(
            self::VECTOR_BODY,
            $this->sign($epochSeconds . '.' . self::VECTOR_BODY),
            self::VECTOR_SECRET,
            $epochSeconds
        );
    }

    public function test_webhook_vector_rejects_a_tampered_body()
    {
        $client = new Malipo('sk_test_123');

        $this->expectException(MalipoException::class);
        $this->expectExceptionMessage('Invalid webhook signature');

        $client->webhooks->constructEvent(
            self::VECTOR_BODY . ' ',
            self::VECTOR_SIGNATURE,
            self::VECTOR_SECRET,
            self::VECTOR_TIMESTAMP,
            0
        );
    }
}
