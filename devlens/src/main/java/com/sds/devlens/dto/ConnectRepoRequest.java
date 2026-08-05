package com.sds.devlens.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConnectRepoRequest {

    // Short repo name e.g. "devlens-backend"
    private String repoName;

    // GitHub web URL e.g. "https://github.com/Shoham-87/devlens-backend"
    private String repoUrl;

    private String language;
}