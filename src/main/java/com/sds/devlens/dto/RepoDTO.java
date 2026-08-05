package com.sds.devlens.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RepoDTO {

    private Long id;

    private String name;

    private String fullName;

    private String language;

    @JsonProperty("isPrivate")
    private boolean isPrivate;

    private String updatedAt;

    private String htmlUrl;

    private boolean alreadyConnected;
}