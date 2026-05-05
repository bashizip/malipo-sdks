package com.malipo.exceptions;

import java.util.Map;

public class MalipoException extends RuntimeException {
    private final int statusCode;
    private final String errorCode;
    private final Map<String, Object> details;

    public MalipoException(String message, int statusCode, String errorCode, Map<String, Object> details) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
    }

    public int getStatusCode() { return statusCode; }
    public String getErrorCode() { return errorCode; }
    public Map<String, Object> getDetails() { return details; }

    @Override
    public String toString() {
        return "MalipoException{" +
                "message='" + getMessage() + '\'' +
                ", statusCode=" + statusCode +
                ", errorCode='" + errorCode + '\'' +
                ", details=" + details +
                '}';
    }
}
