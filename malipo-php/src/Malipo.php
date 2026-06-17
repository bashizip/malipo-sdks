<?php

namespace Malipo;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Malipo\Exceptions\MalipoException;
use Malipo\Resources\Charges;
use Malipo\Resources\Transactions;
use Malipo\Resources\Balance;

class Malipo
{
    private $apiKey;
    private $environment;
    private $baseUrl;
    private $client;

    public $charges;
    public $transactions;
    public $balance;
    public $webhooks;

    public function __construct(string $apiKey, ?string $environment = null, ?string $baseUrl = null)
    {
        if (empty($apiKey)) {
            throw new \InvalidArgumentException("Malipo API Key is required.");
        }

        $this->apiKey = $apiKey;
        $this->environment = $environment ?: ($this->isLiveKey($apiKey) ? 'live' : 'sandbox');
        $this->baseUrl = $baseUrl ?: 'https://api.malipo.dev/v1';

        $this->client = new Client([
            'base_uri' => rtrim($this->baseUrl, '/') . '/',
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'X-Client-Info' => 'malipo-php/1.0.1',
            ],
        ]);

        $this->charges = new Charges($this);
        $this->transactions = new Transactions($this);
        $this->balance = new Balance($this);
        $this->webhooks = new Webhooks();
    }

    private function isLiveKey(string $key): bool
    {
        return strpos($key, 'sk_live_') === 0;
    }

    public function getEnvironment(): string
    {
        return $this->environment;
    }

    public function request(string $method, string $endpoint, array $data = [], array $headers = [])
    {
        try {
            $options = [];
            if (!empty($headers)) {
                $options['headers'] = $headers;
            }

            if ($method === 'POST') {
                $options['json'] = $data;
            } else {
                $options['query'] = $data;
            }

            // Remove leading slash from endpoint so it appends to base_uri correctly
            $endpoint = ltrim($endpoint, '/');

            $response = $this->client->request($method, $endpoint, $options);
            $contents = $response->getBody()->getContents();
            $decoded = json_decode($contents, true);
            
            return $decoded !== null ? $decoded : $contents;

        } catch (GuzzleException $e) {
            $response = $e->getResponse();
            $contents = $response ? $response->getBody()->getContents() : '';
            $data = json_decode($contents, true);
            
            $error = $data['error'] ?? [];
            if (!is_array($error)) {
                $error = ['message' => (string)$error];
            }

            if (empty($error['message']) && !empty($contents) && $data === null) {
                $error['message'] = $contents;
            }

            throw new MalipoException(
                $error['message'] ?? $e->getMessage(),
                $response ? $response->getStatusCode() : 500,
                $error['code'] ?? null,
                $error
            );
        }
    }
}
