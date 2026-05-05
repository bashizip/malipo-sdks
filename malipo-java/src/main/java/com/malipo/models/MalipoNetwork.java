package com.malipo.models;

import com.fasterxml.jackson.annotation.JsonValue;

public enum MalipoNetwork {
    VODACOM_MPESA("VODACOM_MPESA"),
    AIRTEL_MONEY("AIRTEL_MONEY"),
    ORANGE_MONEY("ORANGE_MONEY");

    private final String value;

    MalipoNetwork(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
