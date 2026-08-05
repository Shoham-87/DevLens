package com.sds.devlens.controllers;

import com.sds.devlens.dto.ConnectRepoRequest;
import com.sds.devlens.dto.ConnectedRepoDTO;
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
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static com.sds.devlens.enums.ConnectedRepoStatus.PENDING;

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
        if(Collections.isEmpty(repoDTOList)) return ResponseEntity.ok(repoDTOList);
        List<ConnectedRepo> connectedRepoServices = connectedRepoService.findByUserId(userId);
        if(!Collections.isEmpty(connectedRepoServices)) {
            Set<Long> connectedGithubRepos = connectedRepoServices.stream().map(ConnectedRepo::getGithubRepoId)
                    .collect(Collectors.toSet());
            repoDTOList.stream().filter(item -> connectedGithubRepos.contains(item.getId()))
                    .forEach(item -> item.setAlreadyConnected(true));
        }
        return ResponseEntity.ok(repoDTOList);
    }

    @GetMapping("/repos/connected")
    public ResponseEntity<List<ConnectedRepoDTO>> getConnectedRepos(Authentication authentication){
        String userId = (String) authentication.getPrincipal();
        List<ConnectedRepo> connectedRepo = connectedRepoService.findByUserId(userId);
        List<ConnectedRepoDTO>  connectedRepoDto = connectedRepo.stream()
                .map(item-> new ConnectedRepoDTO(item.getId(),item.getName(),item.getLanguage()
                                ,item.getStatus(),item.getConnectedAt(),item.getChunksCreated()))
                .toList();
        return ResponseEntity.ok(connectedRepoDto);
    }
    @PostMapping("/repos/{repoId}/connect")
    public ResponseEntity<?> connectRepo( Authentication authentication,@PathVariable Long repoId,
                                             @RequestBody ConnectRepoRequest request) {

        String userId = (String) authentication.getPrincipal();
        Optional<ConnectedRepo> existingConnectedRepo = connectedRepoService.findByUserIdAndGithubRepoId(userId,repoId);
        if(existingConnectedRepo.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Repository is Already Connected.");
        }
        ConnectedRepo connectedRepo = connectedRepoService.createConnectedRepo(userId, repoId, request.getRepoName(),
                request.getRepoUrl(), request.getLanguage(), PENDING.getStatus());
        triggerIngestion(connectedRepo.getId());
        return ResponseEntity.ok(Map.of(
                "connectedRepoId", connectedRepo.getId(),
                "status", connectedRepo.getStatus(),
                "message", "Indexing will begin shortly"
        ));
    }

    @GetMapping("/repos/{repoId}/status")
    public ResponseEntity<?> getRepoStatus(Authentication authentication,@PathVariable String repoId) {
        String userId = (String) authentication.getPrincipal();
        Optional<ConnectedRepo> existingConnectedRepo = connectedRepoService.findByIdAndUserId(repoId,userId);
        if(existingConnectedRepo.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Repository Not Found.");
        }
        return ResponseEntity.ok(Map.of(
                "status",          existingConnectedRepo.get().getStatus(),
                "progressPercent", existingConnectedRepo.get().getProgressPercent(),
                "filesProcessed",  existingConnectedRepo.get().getFilesProcessed(),
                "totalFiles",      existingConnectedRepo.get().getTotalFiles(),
                "chunksCreated",   existingConnectedRepo.get().getChunksCreated()
        ));
    }

    @Async
    protected void triggerIngestion(String connectedRepoId) {
        System.out.println("Ingestion triggered for: " + connectedRepoId);
    }
}
