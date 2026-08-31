package com.sds.devlens.services;

import com.sds.devlens.entity.RefreshTokens;
import com.sds.devlens.repository.RefreshTokenRepository;
import com.sds.devlens.utility.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import java.time.Instant;

@Service
public class RefreshTokenImpl implements RefreshToken{

    private RefreshTokenRepository refreshTokenRepository;

    private JwtUtils jwtUtils;

    @Autowired
    public void setRefreshTokenRepository(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Autowired
    public void setJwtUtils(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }
    @Value("${devlens.jwt.refresh-token-time-span}")
    private long refreshTokenSpanInMs;

    @Override
    public String findOrCreateTokens(String userId) {
        RefreshTokens refreshToken = refreshTokenRepository.findByUserId(userId);
        if (!ObjectUtils.isEmpty(refreshToken)){
            if (!refreshToken.isRevoked() && refreshToken.getExpiresAt().isAfter(Instant.now())) {
                return refreshToken.getRefreshTokenValue();
            } else {
                refreshTokenRepository.deleteByUserId(refreshToken.getUserId());
            }
        }
        RefreshTokens newRefreshTokens = new RefreshTokens();
        String refreshTokenValue = jwtUtils.generateRefreshToken(userId);
        newRefreshTokens.setUserId(userId);
        newRefreshTokens.setRefreshTokenValue(refreshTokenValue);
        newRefreshTokens.setExpiresAt(Instant.now().plusMillis(refreshTokenSpanInMs));
        refreshTokenRepository.save(newRefreshTokens);
        return refreshTokenValue;

    }

    @Override
    public void revokeRefreshToken(String refreshToken){
        refreshTokenRepository.revokeByRefreshTokenValue(refreshToken);
    }
}
