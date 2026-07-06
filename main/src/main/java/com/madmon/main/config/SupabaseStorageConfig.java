package com.madmon.main.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

@Configuration
public class SupabaseStorageConfig {

    @Bean
    public RestClient supabaseStorageRestClient(
            @Value("${app.storage.url}") String storageUrl,
            @Value("${app.storage.service-role-key}") String serviceRoleKey
    ) {
        return RestClient.builder()
                .baseUrl(storageUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                .defaultHeader("apikey", serviceRoleKey)
                .build();
    }
}
