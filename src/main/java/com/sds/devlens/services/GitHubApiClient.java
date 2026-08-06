package com.sds.devlens.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sds.devlens.dto.RepoDTO;
import io.jsonwebtoken.lang.Objects;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class GitHubApiClient {

    public List<RepoDTO> fetchUserRepos(String username,String githubAccessToken,int perPageLimit){
        return RestClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader("Authorization", "Bearer " + githubAccessToken)
                .defaultHeader("Accept", "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .build().get()
                .uri("/users/{username}/repos?per_page={perPageLimit}", username,perPageLimit)
                .retrieve()
                .body(new ParameterizedTypeReference<List<RepoDTO>>() {});
    }

    public JsonNode fetchRepoMetadata(String githubAccessToken, String username,String repoName){
        JsonNode githubMeta = RestClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader("Authorization", "Bearer " + githubAccessToken)
                .defaultHeader("Accept", "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .build().get()
                .uri("/repos/{username}/{repoName}", username,repoName)
                .retrieve()
                .body(JsonNode.class);

        ObjectNode customNode = new ObjectMapper().createObjectNode();

        if(!Objects.isEmpty(githubMeta)){
            customNode.put("description",githubMeta.has("description") ?
                    githubMeta.get("description").asText() : "");
            customNode.put("stargazers_count",githubMeta.has("stargazers_count") ?
                    githubMeta.get("stargazers_count").asInt() : 0);
            customNode.put("default_branch",githubMeta.has("default_branch") ?
                    githubMeta.get("default_branch").asText() : "main");
        }
        return customNode;
    }
}