package com.malipo.models;

import com.fasterxml.jackson.annotation.JsonValue;

public enum MalipoTransactionStatus {
    PENDING("pending"),
    SUCCEEDED("succeeded"),
    FAILED("failed"),
    EXPIRED("expired");

    private final String value;

    MalipoTransactionStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
