package com.sds.devlens.services;

import com.sds.devlens.entity.ConnectedRepo;
import com.sds.devlens.repository.ConnectedRepoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static com.sds.devlens.enums.ConnectedRepoStatus.PENDING;

@Service
public class ConnectedRepoServiceImpl implements ConnectedRepoService{

    private ConnectedRepoRepository connectedRepoRepository;

    @Autowired
    public void setConnectedRepoRepository(ConnectedRepoRepository connectedRepoRepository) {
        this.connectedRepoRepository = connectedRepoRepository;
    }

    @Override
    public List<ConnectedRepo> findByUserId(String userId) {
        return connectedRepoRepository.findByUserId(userId);
    }
    @Override
    public Optional<ConnectedRepo> findByUserIdAndGithubRepoId(String userId, Long githubRepoId){
        return Optional.ofNullable(connectedRepoRepository.findByUserIdAndGithubRepoId(userId,githubRepoId));
    }

    @Override
    @Transactional
    public ConnectedRepo createConnectedRepo(String userid,Long githubRepoId,String name,
                                             String repoUrl,String language,String status){
        ConnectedRepo connectedRepo =  new ConnectedRepo();
        connectedRepo.setUserId(userid);
        connectedRepo.setGithubRepoId(githubRepoId);
        connectedRepo.setName(name);
        connectedRepo.setRepoUrl(repoUrl);
        connectedRepo.setLanguage(language);
        connectedRepo.setStatus(status);
        return connectedRepoRepository.save(connectedRepo);
    }
    @Override
    public Optional<ConnectedRepo> findByIdAndUserId(String id,String userId){
        return Optional.ofNullable(connectedRepoRepository.findByIdAndUserId(id,userId));
    }
}
