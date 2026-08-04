package com.sds.devlens.services;

import com.sds.devlens.entity.ConnectedRepo;
import com.sds.devlens.repository.ConnectedRepoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

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
}
