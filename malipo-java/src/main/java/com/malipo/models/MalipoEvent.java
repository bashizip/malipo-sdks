package com.malipo.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MalipoEvent {
    private String id;
    private String object;
    private String type;
    private String environment;
    private Data data;
    
    @JsonProperty("created_at")
    private String createdAt;

    public static class Data {
        private MalipoTransaction object;
        public MalipoTransaction getObject() { return object; }
        public void setObject(MalipoTransaction object) { this.object = object; }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getObject() { return object; }
    public void setObject(String object) { this.object = object; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }
    public Data getData() { return data; }
    public void setData(Data data) { this.data = data; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
