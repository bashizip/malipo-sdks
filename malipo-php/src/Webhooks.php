<?php

namespace Malipo;

use Malipo\Exceptions\MalipoException;

class Webhooks
{
    /** Default replay-protection window, mirroring the Node SDK (5 minutes). */
    public const DEFAULT_TOLERANCE_MS = 300000;

    /**
     * Verify a webhook signature and return the decoded event.
     *
     * The signed message is the timestamp, a literal dot, then the exact raw body,
     * matching the Node SDK. When no timestamp is supplied the legacy body-only
     * scheme is used.
     *
     * @param string      $payload     The raw request body, exactly as received. Do not re-serialize it.
     * @param string      $signature   The value of the X-Webhook-Signature header.
     * @param string      $secret      Your webhook signing secret (64 hex characters, no prefix).
     * @param string|null $timestamp   The value of the X-Webhook-Timestamp header.
     * @param int         $toleranceMs Replay-protection window in milliseconds. Set to 0 to disable.
     *
     * @return array<string, mixed>
     */
    public function constructEvent(
        string $payload,
        string $signature,
        string $secret,
        ?string $timestamp = null,
        int $toleranceMs = self::DEFAULT_TOLERANCE_MS
    ) {
        if (empty($payload) || empty($signature) || empty($secret)) {
            throw new \InvalidArgumentException("Missing payload, signature, or secret for webhook verification.");
        }

        $hasTimestamp = $timestamp !== null && $timestamp !== '';

        if ($hasTimestamp && $toleranceMs > 0) {
            $signedAt = strtotime($timestamp);

            if ($signedAt === false || abs((microtime(true) * 1000) - ($signedAt * 1000)) > $toleranceMs) {
                throw new MalipoException("Webhook timestamp out of window.", 400);
            }
        }

        $signedPayload = $hasTimestamp ? $timestamp . '.' . $payload : $payload;
        $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            throw new MalipoException("Invalid webhook signature.", 400);
        }

        return json_decode($payload, true);
    }
}
