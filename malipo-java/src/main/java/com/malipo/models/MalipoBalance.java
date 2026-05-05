package com.malipo.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MalipoBalance {
    private String object;
    private List<Amount> available;
    private List<Amount> pending;
    
    @JsonProperty("updated_at")
    private String updatedAt;

    public static class Amount {
        private double amount;
        private String currency;

        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        public String getCurrency() { return currency; }
        public void setCurrency(String currency) { this.currency = currency; }
    }

    public String getObject() { return object; }
    public void setObject(String object) { this.object = object; }
    public List<Amount> getAvailable() { return available; }
    public void setAvailable(List<Amount> available) { this.available = available; }
    public List<Amount> getPending() { return pending; }
    public void setPending(List<Amount> pending) { this.pending = pending; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
