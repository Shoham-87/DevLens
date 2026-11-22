package com.sds.devlens.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sds.devlens.dto.RepoDTO;
import io.jsonwebtoken.lang.Objects;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.DefaultUriBuilderFactory;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    public List<Map<String, Object>> fetchRepoTree(String githubAccessToken, String username, String repoName) {
        JsonNode tree = githubClient(githubAccessToken, "application/vnd.github+json").get()
                .uri("/repos/{username}/{repoName}/git/trees/HEAD?recursive=1", username, repoName)
                .retrieve()
                .body(JsonNode.class);

        List<Map<String, Object>> entries = new ArrayList<>();
        if (tree == null || !tree.has("tree")) {
            return entries;
        }
        for (JsonNode node : tree.get("tree")) {
            String type = node.path("type").asText();
            if (!"blob".equals(type) && !"tree".equals(type)) {
                continue;
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("path", node.path("path").asText());
            entry.put("type", "tree".equals(type) ? "dir" : "file");
            entry.put("size", node.path("size").asLong(0));
            entries.add(entry);
        }
        return entries;
    }

    public String fetchFileContent(String githubAccessToken, String username, String repoName, String path) {
        return githubClient(githubAccessToken, "application/vnd.github.raw+json").get()
                .uri("/repos/{username}/{repoName}/contents/{path}", username, repoName, path)
                .retrieve()
                .body(String.class);
    }

    private RestClient githubClient(String githubAccessToken, String accept) {
        DefaultUriBuilderFactory uriFactory = new DefaultUriBuilderFactory("https://api.github.com");
        uriFactory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.URI_COMPONENT);
        return RestClient.builder()
                .uriBuilderFactory(uriFactory)
                .defaultHeader("Authorization", "Bearer " + githubAccessToken)
                .defaultHeader("Accept", accept)
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .build();
    }
}