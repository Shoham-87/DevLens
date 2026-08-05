package com.sds.devlens.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConnectedRepoDTO {

    private String id;

    private String name;

    private String language;

    // PENDING | INDEXING | READY | FAILED — drives status badge colour on dashboard
    private String status;

    // When the user first connected this repo — shown as "Connected 2 days ago"
    private Instant connectedAt;

    // Number of code chunks created by ingestion pipeline — 0 until Phase 2
    private int chunksCreated;
}