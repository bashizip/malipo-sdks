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
}
