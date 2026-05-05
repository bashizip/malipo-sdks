package com.malipo;

import com.malipo.models.MalipoNetwork;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MalipoTest {

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
}
