package com.sds.devlens.services;

import com.sds.devlens.entity.ConnectedRepo;

import java.util.List;

public interface ConnectedRepoService {
    public List<ConnectedRepo> findByUserId(String userId);
}
