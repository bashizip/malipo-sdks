package com.malipo.resources;

import com.malipo.Malipo;
import com.malipo.models.MalipoTransaction;

public class TransactionsResource {
    private final Malipo client;

    public TransactionsResource(Malipo client) {
        this.client = client;
    }

    public MalipoTransaction retrieve(String id) {
        return client.request("GET", "/transaction-status?id=" + id, null, MalipoTransaction.class);
    }
}
