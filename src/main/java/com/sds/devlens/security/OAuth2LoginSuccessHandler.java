package com.sds.devlens.security;

import com.sds.devlens.entity.Users;
import com.sds.devlens.services.RefreshToken;
import com.sds.devlens.services.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private UserService userService;

    private RefreshToken refreshToken;

    private OAuth2AuthorizedClientService authorizedClientService;

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

    @Autowired
    public void setAuthorizedClientService(OAuth2AuthorizedClientService authorizedClientService) {
        this.authorizedClientService = authorizedClientService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User=(OAuth2User) authentication.getPrincipal();
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                oauthToken.getAuthorizedClientRegistrationId(),
                oauthToken.getName()
        );
        String githubAccessToken = client.getAccessToken().getTokenValue();
        Users user = userService.findOrCreateUser(oAuth2User,githubAccessToken );

        String refreshTokenValue = refreshToken.findOrCreateTokens(user.getId());
        String accessToken = userService.getAccessToken(user.getId(),user.getGithubId());

        // 1. Create secure cookies for your tokens
//        Cookie accessCookie = new Cookie("accessToken", accessToken);
//        accessCookie.setHttpOnly(true);
//        accessCookie.setSecure(true);
//        accessCookie.setPath("/");
//        accessCookie.setMaxAge(900);
//
//        Cookie refreshCookie = new Cookie("refreshToken", refreshTokenValue);
//        refreshCookie.setHttpOnly(true);
//        refreshCookie.setSecure(true);
//        refreshCookie.setPath("/auth/refresh");
//        refreshCookie.setMaxAge(2592000);

        String redirectUrl = UriComponentsBuilder
                .fromUriString(frontendUrl + "/devlens/login")
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshTokenValue)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);

    }
}
