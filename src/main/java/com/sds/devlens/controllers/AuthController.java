package com.sds.devlens.controllers;

import com.sds.devlens.entity.RefreshTokens;
import com.sds.devlens.repository.RefreshTokenRepository;
import com.sds.devlens.services.RefreshToken;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/devlens")
public class AuthController {

    private RefreshToken refreshTokenService;

    @Autowired
    public void setRefreshTokenService(RefreshToken refreshTokenService) {
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, Object>> logout(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (StringUtils.isNoneBlank(refreshToken)) {
            refreshTokenService.revokeRefreshToken(refreshToken);
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
