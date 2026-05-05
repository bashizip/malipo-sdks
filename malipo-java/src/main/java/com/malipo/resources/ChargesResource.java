package com.malipo.resources;

import com.malipo.Malipo;
import com.malipo.models.ChargeCreateParams;
import com.malipo.models.MalipoTransaction;

import java.util.HashMap;
import java.util.Map;

public class ChargesResource {
    private final Malipo client;

    public ChargesResource(Malipo client) {
        this.client = client;
    }

    public MalipoTransaction create(ChargeCreateParams params) {
        return create(params, null);
    }

    public MalipoTransaction create(ChargeCreateParams params, String idempotencyKey) {
        Map<String, String> headers = new HashMap<>();
        if (idempotencyKey != null) {
            headers.put("Idempotency-Key", idempotencyKey);
        }
        return client.request("POST", "/charge", params, MalipoTransaction.class, headers);
    }
}
