package com.sds.devlens.services;

import com.sds.devlens.enums.IngestionEnum;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class IngestionImpl implements Ingestion{

    private RestClient restClient;


    public IngestionImpl(@Value("${devlens.ingestion.url}") String ingestionUrl) {
        this.restClient = RestClient.builder().baseUrl(ingestionUrl).build();
    }

    @Override
    public String checkHealth() {
        return getRestClient().get()
                .uri("/{endpoint}",IngestionEnum.HEALTH.getIngestionValue().toLowerCase())
                .retrieve().body(String.class);
    }

    public RestClient getRestClient() {
        return restClient;
    }
}
