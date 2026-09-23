package com.crampiler.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The single source of truth for CORS. Replaces the old @CrossOrigin
 * annotations (which allowed every origin regardless of this config) so
 * that crampiler.client.origin actually does something. Supports a
 * comma-separated list, e.g. for allowing both your local dev server and
 * a deployed frontend at once.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${crampiler.client.origin:http://localhost:5173}")
    private String clientOrigin;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(clientOrigin.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}