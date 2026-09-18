package com.malipo;

import com.malipo.models.MalipoEvent;
import com.malipo.models.MalipoNetwork;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

public class MalipoTest {

    /**
     * Published in malipo-sdks/samples/webhook-test-vectors.md. The signature is asserted
     * as a literal so the shared contract across every SDK cannot drift silently.
     */
    private static final String VECTOR_SECRET = "whsec_example_only";
    private static final String VECTOR_TIMESTAMP = "2026-09-18T07:30:00.000Z";
    private static final String VECTOR_BODY = "{\"id\": \"evt_test_1234567890abcdef\", \"object\": \"event\", \"type\": \"charge.succeeded\", \"environment\": \"sandbox\", \"created_at\": \"2026-09-18T07:29:58.000Z\", \"data\": {\"object\": {\"id\": \"tx_12345\", \"object\": \"transaction\", \"amount\": 50, \"currency\": \"USD\", \"requested_currency\": \"USD\", \"status\": \"succeeded\", \"phone\": \"+243831386749\", \"network\": \"VODACOM_MPESA\", \"environment\": \"sandbox\", \"metadata\": {}, \"created_at\": \"2026-09-18T07:29:58.000Z\"}}}";
    private static final String VECTOR_SIGNATURE = "457fada06ad0a706baee51fb3a6cb06bcdc179c95c82c24bafe17fb90fe4d343";
    private static final String VECTOR_LEGACY_SIGNATURE = "53878fca703f5121a9e19a31edf7bbd5d28e1ce734bc0e9211d8e7715780658a";

    @Test
    public void testInferredEnvironment() {
        Malipo sandboxClient = new Malipo("sk_test_123");
        assertEquals("sandbox", sandboxClient.getConfig().getEnvironment());

        Malipo liveClient = new Malipo("sk_live_123");
        assertEquals("live", liveClient.getConfig().getEnvironment());
    }

    @Test
    public void testExplicitEnvironment() {
        Malipo client = new Malipo(MalipoConfig.builder()
                .apiKey("sk_test_123")
                .environment("live")
                .build());
        assertEquals("live", client.getConfig().getEnvironment());
    }

    @Test
    public void testNetworkEnum() {
        assertEquals("VODACOM_MPESA", MalipoNetwork.VODACOM_MPESA.getValue());
        assertEquals("AIRTEL_MONEY", MalipoNetwork.AIRTEL_MONEY.getValue());
        assertEquals("ORANGE_MONEY", MalipoNetwork.ORANGE_MONEY.getValue());
    }

    @Test
    public void testWebhookVectorAcceptsTheTimestampedScheme() {
        Malipo client = new Malipo("sk_test_123");

        MalipoEvent event = client.webhooks.constructEvent(
                VECTOR_BODY, VECTOR_SIGNATURE, VECTOR_SECRET, VECTOR_TIMESTAMP, 0L);

        assertEquals("evt_test_1234567890abcdef", event.getId());
        assertEquals("charge.succeeded", event.getType());
        assertEquals("tx_12345", event.getData().getObject().getId());
    }

    @Test
    public void testWebhookVectorRejectsALiveDeliveryWhenVerifiedWithoutTheTimestamp() {
        Malipo client = new Malipo("sk_test_123");

        RuntimeException error = assertThrows(RuntimeException.class, () ->
                client.webhooks.constructEvent(VECTOR_BODY, VECTOR_SIGNATURE, VECTOR_SECRET));

        assertEquals("Invalid webhook signature.", error.getMessage());
    }

    @Test
    public void testWebhookVectorStillAcceptsTheLegacyBodyOnlyScheme() {
        Malipo client = new Malipo("sk_test_123");

        MalipoEvent event = client.webhooks.constructEvent(
                VECTOR_BODY, VECTOR_LEGACY_SIGNATURE, VECTOR_SECRET);

        assertEquals("evt_test_1234567890abcdef", event.getId());
    }

    @Test
    public void testWebhookVectorAcceptsAFreshTimestampWithTheDefaultWindow() throws Exception {
        Malipo client = new Malipo("sk_test_123");
        String timestamp = Instant.now().toString();

        MalipoEvent event = client.webhooks.constructEvent(
                VECTOR_BODY, sign(timestamp + "." + VECTOR_BODY), VECTOR_SECRET, timestamp);

        assertEquals("evt_test_1234567890abcdef", event.getId());
    }

    @Test
    public void testWebhookVectorRejectsAStaleTimestamp() throws Exception {
        Malipo client = new Malipo("sk_test_123");
        String stale = "2020-01-01T00:00:00.000Z";

        RuntimeException error = assertThrows(RuntimeException.class, () ->
                client.webhooks.constructEvent(
                        VECTOR_BODY, sign(stale + "." + VECTOR_BODY), VECTOR_SECRET, stale));

        assertEquals("Webhook timestamp out of window.", error.getMessage());
    }

    @Test
    public void testWebhookVectorRejectsAnUnparseableTimestamp() {
        Malipo client = new Malipo("sk_test_123");

        RuntimeException error = assertThrows(RuntimeException.class, () ->
                client.webhooks.constructEvent(
                        VECTOR_BODY, "irrelevant", VECTOR_SECRET, "1758171000"));

        assertEquals("Webhook timestamp out of window.", error.getMessage());
    }

    @Test
    public void testWebhookVectorRejectsATamperedBody() {
        Malipo client = new Malipo("sk_test_123");

        RuntimeException error = assertThrows(RuntimeException.class, () ->
                client.webhooks.constructEvent(
                        VECTOR_BODY + " ", VECTOR_SIGNATURE, VECTOR_SECRET, VECTOR_TIMESTAMP, 0L));

        assertEquals("Invalid webhook signature.", error.getMessage());
    }

    private static String sign(String message) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(VECTOR_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));

        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
