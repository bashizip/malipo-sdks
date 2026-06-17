package com.malipo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.malipo.exceptions.MalipoException;
import com.malipo.resources.BalanceResource;
import com.malipo.resources.ChargesResource;
import com.malipo.resources.TransactionsResource;
import com.malipo.resources.WebhooksResource;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Collections;
import java.util.Map;

public class Malipo {
    private final MalipoConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public final ChargesResource charges;
    public final TransactionsResource transactions;
    public final BalanceResource balance;
    public final WebhooksResource webhooks;

    public Malipo(String apiKey) {
        this(MalipoConfig.builder().apiKey(apiKey).build());
    }

    public Malipo(MalipoConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder().build();
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        
        this.charges = new ChargesResource(this);
        this.transactions = new TransactionsResource(this);
        this.balance = new BalanceResource(this);
        this.webhooks = new WebhooksResource();
    }

    public MalipoConfig getConfig() {
        return config;
    }

    public <T> T request(String method, String endpoint, Object body, Class<T> responseClass) {
        return request(method, endpoint, body, responseClass, Collections.emptyMap());
    }

    public <T> T request(String method, String endpoint, Object body, Class<T> responseClass, Map<String, String> headers) {
        try {
            String url = config.getBaseUrl() + endpoint;
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + config.getApiKey())
                    .header("Content-Type", "application/json")
                    .header("X-Client-Info", "malipo-java/1.0.1");

            headers.forEach(requestBuilder::header);

            String requestBody = body != null ? objectMapper.writeValueAsString(body) : "";
            
            switch (method.toUpperCase()) {
                case "POST":
                    requestBuilder.POST(HttpRequest.BodyPublishers.ofString(requestBody));
                    break;
                case "GET":
                    requestBuilder.GET();
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported HTTP method: " + method);
            }

            HttpResponse<String> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                handleError(response);
            }

            return objectMapper.readValue(response.body(), responseClass);

        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to execute Malipo API request", e);
        }
    }

    private void handleError(HttpResponse<String> response) {
        Map<String, Object> errorData = null;
        try {
            errorData = objectMapper.readValue(response.body(), Map.class);
        } catch (IOException e) {
            // Not a JSON response
        }

        Map<String, Object> error = errorData != null ? (Map<String, Object>) errorData.get("error") : null;
        
        String message = error != null ? (String) error.get("message") : 
                        (response.body() != null && !response.body().isEmpty() ? response.body() : "An unexpected error occurred");
        String code = error != null ? (String) error.get("code") : null;
        
        throw new MalipoException(message, response.statusCode(), code, error != null ? error : errorData);
    }
}
