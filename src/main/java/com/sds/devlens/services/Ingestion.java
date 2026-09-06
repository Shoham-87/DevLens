package com.sds.devlens.services;

import com.sds.devlens.dto.IngestRequest;
import org.springframework.http.ResponseEntity;

public interface Ingestion {
    public String checkHealth();
    public ResponseEntity<Void> triggerIngestion(IngestRequest ingestRequest);
}
