package com.sds.devlens.services;

import com.sds.devlens.entity.ConnectedRepo;

import java.util.List;
import java.util.Optional;

public interface ConnectedRepoService {
    public List<ConnectedRepo> findByUserId(String userId);
    public Optional<ConnectedRepo> findByUserIdAndGithubRepoId(String userId, Long githubRepoId);
    public ConnectedRepo createConnectedRepo(String userid,Long githubRepoId,String name,
                                             String repoUrl,String language,String status);
    public Optional<ConnectedRepo> findByIdAndUserId(String id,String userId);
}
