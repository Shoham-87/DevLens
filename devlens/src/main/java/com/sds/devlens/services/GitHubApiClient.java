package com.sds.devlens.services;

import com.sds.devlens.dto.RepoDTO;
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
}