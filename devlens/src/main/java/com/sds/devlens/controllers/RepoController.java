package com.sds.devlens.controllers;

import com.sds.devlens.dto.RepoDTO;
import com.sds.devlens.entity.ConnectedRepo;
import com.sds.devlens.entity.Users;
import com.sds.devlens.services.ConnectedRepoService;
import com.sds.devlens.services.GitHubApiClient;
import com.sds.devlens.services.UserService;
import io.jsonwebtoken.lang.Collections;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/devlens")
public class RepoController {

    private UserService userService;

    private GitHubApiClient gitHubApiClient;

    private ConnectedRepoService connectedRepoService;

    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }

    @Autowired
    public void setGitHubApiClient(GitHubApiClient gitHubApiClient) {
        this.gitHubApiClient = gitHubApiClient;
    }

    @Autowired
    public void setConnectedRepoService(ConnectedRepoService connectedRepoService) {
        this.connectedRepoService = connectedRepoService;
    }

    @GetMapping("/repos")
    public ResponseEntity<List<RepoDTO>> getGithubRepos(Authentication authentication,
                                                           @RequestParam(defaultValue = "1") int page,
                                                           @RequestParam(defaultValue = "100") int perPage,
                                                           @RequestParam(defaultValue = "updated") String sort) {

        String userId = (String) authentication.getPrincipal();
        Users user = userService.findUserByUserId(userId);
        List<RepoDTO> repoDTOList =  gitHubApiClient.fetchUserRepos(user.getUsername(),user.getGithubAccessToken(),perPage);
        if(Collections.isEmpty(repoDTOList)) return ResponseEntity.notFound().build();
        List<ConnectedRepo> connectedRepoServices = connectedRepoService.findByUserId(userId);
        if(!Collections.isEmpty(connectedRepoServices)) {
            Set<Long> connectedGithubRepos = connectedRepoServices.stream().map(ConnectedRepo::getGithubRepoId)
                    .collect(Collectors.toSet());
            repoDTOList.stream().filter(item -> connectedGithubRepos.contains(item.getId()))
                    .forEach(item -> item.setAlreadyConnected(true));
        }
        return ResponseEntity.ok(repoDTOList);
    }

}
