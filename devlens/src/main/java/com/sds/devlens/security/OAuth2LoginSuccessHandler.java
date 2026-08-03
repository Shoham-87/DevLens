package com.sds.devlens.security;

import com.sds.devlens.entity.RefreshTokens;
import com.sds.devlens.entity.Users;
import com.sds.devlens.repository.RefreshTokenRepository;
import com.sds.devlens.services.RefreshToken;
import com.sds.devlens.services.UserService;
import com.sds.devlens.utility.JwtUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriBuilderFactory;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Instant;
import java.util.Date;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private UserService userService;

    private RefreshToken refreshToken;

    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }

    @Autowired
    public void setRefreshToken(RefreshToken refreshToken) {
        this.refreshToken = refreshToken;
    }

    @Value("${devlens.frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User=(OAuth2User) authentication.getPrincipal();
        Users user = userService.findOrCreateUser(oAuth2User);

        String accessToken = userService.getAccessToken(user.getId(),user.getGithubId());
        String refreshTokenValue = refreshToken.findOrCreateTokens(user.getId());

        String redirectUrl = UriComponentsBuilder
                .fromUriString(frontendUrl + "/devlens/login")
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshTokenValue)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);

    }
}
