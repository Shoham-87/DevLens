package com.sds.devlens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IngestRequest {

    @NotBlank(message = "connectedRepoId cannot be empty")
    private String connectedRepoId;

    @NotBlank(message = "repoUrl cannot be empty")
    private String repoUrl;

    @NotBlank(message = "githubAccessToken cannot be empty")
    private String githubAccessToken;

    @NotBlank(message = "repoName cannot be empty")
    private String repoName;
}