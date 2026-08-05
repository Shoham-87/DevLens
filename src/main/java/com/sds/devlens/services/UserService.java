package com.sds.devlens.services;

import com.sds.devlens.entity.Users;
import org.springframework.security.oauth2.core.user.OAuth2User;

public interface UserService {
    public Users findOrCreateUser(OAuth2User oauth2User, String githubAccessToken);
    public String getAccessToken(String userId,Long githubId);
    public Users findUserByUserId(String userId);
}
