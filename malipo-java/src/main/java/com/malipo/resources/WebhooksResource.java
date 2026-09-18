package com.malipo.resources;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.malipo.models.MalipoEvent;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;

public class WebhooksResource {
    /** Default replay-protection window, mirroring the Node SDK (5 minutes). */
    public static final long DEFAULT_TOLERANCE_MS = 300_000L;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verify a webhook using the legacy body-only scheme.
     *
     * @param payload   the raw request body, exactly as received
     * @param signature the value of the X-Webhook-Signature header
     * @param secret    your webhook signing secret (64 hex characters, no prefix)
     */
    public MalipoEvent constructEvent(String payload, String signature, String secret) {
        return constructEvent(payload, signature, secret, null, DEFAULT_TOLERANCE_MS);
    }

    /**
     * Verify a webhook signed over the timestamp and the raw body.
     *
     * @param timestamp the value of the X-Webhook-Timestamp header
     */
    public MalipoEvent constructEvent(String payload, String signature, String secret, String timestamp) {
        return constructEvent(payload, signature, secret, timestamp, DEFAULT_TOLERANCE_MS);
    }

    /**
     * Verify a webhook signature and return the decoded event.
     *
     * The signed message is the timestamp, a literal dot, then the exact raw body,
     * matching the Node SDK. When {@code timestamp} is null or empty the legacy
     * body-only scheme is used.
     *
     * @param payload     the raw request body, exactly as received; do not re-serialize it
     * @param signature   the value of the X-Webhook-Signature header
     * @param secret      your webhook signing secret (64 hex characters, no prefix)
     * @param timestamp   the value of the X-Webhook-Timestamp header, may be null
     * @param toleranceMs replay-protection window in milliseconds; set to 0 to disable
     */
    public MalipoEvent constructEvent(String payload, String signature, String secret, String timestamp,
            long toleranceMs) {
        if (payload == null || signature == null || secret == null) {
            throw new IllegalArgumentException("Missing payload, signature, or secret for webhook verification.");
        }

        boolean hasTimestamp = timestamp != null && !timestamp.isEmpty();

        if (hasTimestamp && toleranceMs > 0) {
            long skewMs;
            try {
                skewMs = Math.abs(Duration.between(Instant.now(), Instant.parse(timestamp)).toMillis());
            } catch (DateTimeParseException e) {
                throw new RuntimeException("Webhook timestamp out of window.", e);
            }

            if (skewMs > toleranceMs) {
                throw new RuntimeException("Webhook timestamp out of window.");
            }
        }

        String signedPayload = hasTimestamp ? timestamp + "." + payload : payload;

        String computedSignature;
        try {
            computedSignature = hmacSha256(signedPayload, secret);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to compute webhook signature", e);
        }

        if (!MessageDigest.isEqual(
                computedSignature.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8))) {
            throw new RuntimeException("Invalid webhook signature.");
        }

        try {
            return objectMapper.readValue(payload, MalipoEvent.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to construct webhook event", e);
        }
    }

    private String hmacSha256(String data, String key) throws NoSuchAlgorithmException, InvalidKeyException {
        SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(secretKeySpec);
        byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(bytes);
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
