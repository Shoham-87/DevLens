package com.sds.devlens.services;

import com.sds.devlens.entity.Users;
import com.sds.devlens.repository.UsersRepository;
import com.sds.devlens.utility.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

import static com.sds.devlens.utility.SimpleMethod.getAttributeFromObjectElseEmpty;
import static com.sds.devlens.utility.SimpleMethod.getStringOrDefault;

@Service
public class UserServiceImpl implements UserService {

    private final UsersRepository usersRepository;

    private JwtUtils jwtUtils;


    @Autowired
    public UserServiceImpl(UsersRepository userRepository) {
        this.usersRepository = userRepository;
    }

    @Autowired
    public void setJwtUtils(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    public Users findOrCreateUser(OAuth2User oauth2User, String githubAccessToken) {
        Long githubUserId = Optional.ofNullable(oauth2User.getAttribute("id"))
                .map(Object::toString)
                .map(Long::valueOf)
                .orElse(null);

        if (githubUserId == null) {
            throw new IllegalStateException("GitHub did not return a user id — cannot proceed with login");
        }

        Optional<Users> existingUser = usersRepository.findByGithubId(githubUserId);

        if (existingUser.isPresent()) {
            Users user = existingUser.get();
            user.setLastLoginAt(Instant.now());
            String avatarUrl = getStringOrDefault(oauth2User.getAttribute("avatar_url"),user.getAvatarUrl());
            user.setAvatarUrl(avatarUrl);
            return usersRepository.save(user);
        }
        Users users = new Users();
        String username = getAttributeFromObjectElseEmpty(oauth2User.getAttribute("login")).toString();
        String emailAddress = getAttributeFromObjectElseEmpty(oauth2User.getAttribute("email")).toString();
        String avatarUrl = getAttributeFromObjectElseEmpty(oauth2User.getAttribute("avatar_url")).toString();
        users.setGithubId(githubUserId);
        users.setGithubAccessToken(githubAccessToken);
        users.setUsername(username);
        users.setAvatarUrl(avatarUrl);
        users.setEmailAddress(emailAddress);
        users.setLastLoginAt(Instant.now());
        return usersRepository.save(users);
    }

    @Override
    public String getAccessToken(String userId, Long githubId) {
        return jwtUtils.generateAccessToken(userId,githubId);
    }

    @Override
    public Users findUserByUserId(String userId){
        return usersRepository.findById(userId).orElseGet(Users::new);
    }

}
