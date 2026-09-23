package com.crampiler.dto;

import jakarta.validation.constraints.NotBlank;

public class SyncRequest {

    @NotBlank
    private String icsUrl;

    public String getIcsUrl() { return icsUrl; }
    public void setIcsUrl(String icsUrl) { this.icsUrl = icsUrl; }
}
