package com.sds.devlens.controllers;

import com.sds.devlens.dto.ChatRequest;
import com.sds.devlens.entity.ConnectedRepo;
import com.sds.devlens.entity.Users;
import com.sds.devlens.enums.ConnectedRepoStatus;
import com.sds.devlens.repository.ConnectedRepoRepository;
import com.sds.devlens.repository.UsersRepository;
import com.sds.devlens.services.ChatService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/devlens")
public class ChatController {

    private final ConnectedRepoRepository connectedRepoRepository;
    private final UsersRepository userRepository;
    private final ChatService chatService;

    public ChatController(ConnectedRepoRepository connectedRepoRepository,
                          UsersRepository userRepository,
                          ChatService chatService) {
        this.connectedRepoRepository = connectedRepoRepository;
        this.userRepository = userRepository;
        this.chatService = chatService;
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Object chat(Authentication authentication, @RequestBody ChatRequest request) {
        String userId = (String) authentication.getPrincipal();
        Users user = userRepository.findById(userId)
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "User not found"));
        }

        Optional<ConnectedRepo> repoOpt = Optional.ofNullable(connectedRepoRepository
                .findByIdAndUserId(request.getConnectedRepoId(), userId));

        if (repoOpt.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", "Repository not found"));
        }

        ConnectedRepo repo = repoOpt.get();
        if (!ConnectedRepoStatus.READY.getStatus().equals(repo.getStatus())) {
            return ResponseEntity.status(409)
                    .body(Map.of(
                            "message", "Repository is not ready for chat yet",
                            "status", repo.getStatus()
                    ));
        }

        SseEmitter emitter = new SseEmitter(180_000L);

        chatService.streamChatResponse(request, emitter);

        return emitter;
    }
}
