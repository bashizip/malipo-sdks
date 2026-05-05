<?php

namespace Malipo\Resources;

use Malipo\Malipo;

class Charges
{
    private $client;

    public function __construct(Malipo $client)
    {
        $this->client = $client;
    }

    public function create(array $params, array $options = [])
    {
        $headers = [];
        if (isset($options['idempotencyKey'])) {
            $headers['Idempotency-Key'] = $options['idempotencyKey'];
        }

        return $this->client->request('POST', '/charge', $params, $headers);
    }
}
