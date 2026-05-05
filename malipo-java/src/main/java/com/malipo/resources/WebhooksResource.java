package com.malipo.resources;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.malipo.models.MalipoEvent;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

public class WebhooksResource {
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MalipoEvent constructEvent(String payload, String signature, String secret) {
        if (payload == null || signature == null || secret == null) {
            throw new IllegalArgumentException("Missing payload, signature, or secret for webhook verification.");
        }

        try {
            String computedSignature = hmacSha256(payload, secret);
            if (!computedSignature.equals(signature)) {
                throw new RuntimeException("Invalid webhook signature.");
            }

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
