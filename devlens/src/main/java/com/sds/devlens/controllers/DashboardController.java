package com.sds.devlens.controllers;

import com.sds.devlens.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/devlens")
public class DashboardController {

    private final UsersRepository usersRepository;

    public DashboardController(UsersRepository usersRepository) {
        this.usersRepository = usersRepository;
    }

    @Value("${devlens.frontend.url}")
    private String frontendUrl;

    @GetMapping("/homepage")
    public ResponseEntity<Void> homepage() {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(frontendUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/me")
        public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String userId = (String) authentication.getPrincipal();

        return usersRepository.findById(userId)
                .map(user -> ResponseEntity.ok(Map.of(
                        "id", user.getId(),
                        "githubUsername", user.getUsername(),
                        "displayName", user.getUsername(),
                        "avatarUrl", user.getAvatarUrl(),
                        "email", user.getEmailAddress()
                )))
                .orElse(ResponseEntity.notFound().build());
    }
}
