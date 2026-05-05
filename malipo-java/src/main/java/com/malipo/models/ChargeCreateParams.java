package com.malipo.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ChargeCreateParams {
    private double amount;
    private String currency;
    private String phone;
    private MalipoNetwork network;
    private String description;
    private Map<String, Object> metadata;
    private MalipoPayer payer;

    // Getters and Setters
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public MalipoNetwork getNetwork() { return network; }
    public void setNetwork(MalipoNetwork network) { this.network = network; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public MalipoPayer getPayer() { return payer; }
    public void setPayer(MalipoPayer payer) { this.payer = payer; }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ChargeCreateParams params = new ChargeCreateParams();

        public Builder amount(double amount) { params.setAmount(amount); return this; }
        public Builder currency(String currency) { params.setCurrency(currency); return this; }
        public Builder phone(String phone) { params.setPhone(phone); return this; }
        public Builder network(MalipoNetwork network) { params.setNetwork(network); return this; }
        public Builder description(String description) { params.setDescription(description); return this; }
        public Builder metadata(Map<String, Object> metadata) { params.setMetadata(metadata); return this; }
        public Builder payer(MalipoPayer payer) { params.setPayer(payer); return this; }

        public ChargeCreateParams build() { return params; }
    }
}
