<?php

namespace Malipo\Resources;

use Malipo\Malipo;

class Transactions
{
    private $client;

    public function __construct(Malipo $client)
    {
        $this->client = $client;
    }

    public function retrieve(string $id)
    {
        return $this->client->request('GET', '/transaction-status', ['id' => $id]);
    }
}
