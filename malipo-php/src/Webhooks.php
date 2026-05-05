<?php

namespace Malipo;

use Malipo\Exceptions\MalipoException;

class Webhooks
{
    public function constructEvent(string $payload, string $signature, string $secret)
    {
        if (empty($payload) || empty($signature) || empty($secret)) {
            throw new \InvalidArgumentException("Missing payload, signature, or secret for webhook verification.");
        }

        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            throw new MalipoException("Invalid webhook signature.", 400);
        }

        return json_decode($payload, true);
    }
}
