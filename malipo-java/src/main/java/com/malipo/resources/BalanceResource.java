package com.malipo.resources;

import com.malipo.Malipo;
import com.malipo.models.MalipoBalance;

public class BalanceResource {
    private final Malipo client;

    public BalanceResource(Malipo client) {
        this.client = client;
    }

    public MalipoBalance retrieve() {
        String endpoint = "live".equals(client.getConfig().getEnvironment()) ? "/live-balance" : "/sandbox-balance";
        return client.request("GET", endpoint, null, MalipoBalance.class);
    }
}
