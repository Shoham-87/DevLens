package com.sds.devlens.services;

import com.sds.devlens.entity.RefreshTokens;

public interface RefreshToken {
    public String findOrCreateTokens(String userId);
    public void revokeRefreshToken(String refreshToken);
}
