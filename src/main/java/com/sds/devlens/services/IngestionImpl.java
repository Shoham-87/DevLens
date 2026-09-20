package com.sds.devlens.services;

import com.sds.devlens.dto.IngestRequest;
import com.sds.devlens.enums.IngestionEnum;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
        return restClient.get()
                .uri("/{endpoint}",IngestionEnum.HEALTH.getIngestionValue().toLowerCase())
                .retrieve().body(String.class);
    }

    @Override
    public ResponseEntity<Void> triggerIngestion(IngestRequest ingestRequest) {
        return restClient.post()
                .uri("/{endpoint}",IngestionEnum.INGEST.getIngestionValue().toLowerCase())
                .contentType(MediaType.APPLICATION_JSON)
                .body(ingestRequest)
                .retrieve().toBodilessEntity();
    }

}
