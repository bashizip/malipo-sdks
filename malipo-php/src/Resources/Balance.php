<?php

namespace Malipo\Resources;

use Malipo\Malipo;

class Balance
{
    private $client;

    public function __construct(Malipo $client)
    {
        $this->client = $client;
    }

    public function retrieve()
    {
        $endpoint = $this->client->getEnvironment() === 'live' ? '/live-balance' : '/sandbox-balance';
        return $this->client->request('GET', $endpoint);
    }
}
