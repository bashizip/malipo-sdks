package com.malipo;

public class MalipoConfig {
    private final String apiKey;
    private final String environment;
    private final String baseUrl;

    private MalipoConfig(Builder builder) {
        this.apiKey = builder.apiKey;
        this.environment = builder.environment != null ? builder.environment : 
            (apiKey.startsWith("sk_live_") ? "live" : "sandbox");
        this.baseUrl = builder.baseUrl != null ? builder.baseUrl : "https://api.malipo.dev";
    }

    public String getApiKey() { return apiKey; }
    public String getEnvironment() { return environment; }
    public String getBaseUrl() { return baseUrl; }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String apiKey;
        private String environment;
        private String baseUrl;

        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        public Builder environment(String environment) {
            this.environment = environment;
            return this;
        }

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public MalipoConfig build() {
            if (apiKey == null || apiKey.isEmpty()) {
                throw new IllegalArgumentException("Malipo API Key is required.");
            }
            return new MalipoConfig(this);
        }
    }
}
