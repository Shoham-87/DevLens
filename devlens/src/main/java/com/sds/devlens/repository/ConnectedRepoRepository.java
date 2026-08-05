package com.sds.devlens.repository;

import com.sds.devlens.entity.ConnectedRepo;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConnectedRepoRepository extends MongoRepository<ConnectedRepo,String> {
    public List<ConnectedRepo> findByUserId(String userId);
    public ConnectedRepo findByUserIdAndGithubRepoId(String userId,Long githubRepoId);
    public ConnectedRepo findByIdAndUserId(String id,String userId);
}
