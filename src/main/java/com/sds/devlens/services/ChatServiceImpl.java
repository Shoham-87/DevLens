package com.sds.devlens.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sds.devlens.dto.ChatRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

@Slf4j
@Service
public class ChatServiceImpl implements ChatService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public ChatServiceImpl(@Value("${devlens.ingestion.url}") String ingestionUrl,
                           ObjectMapper objectMapper) {
        this.restClient = RestClient.builder()
                .baseUrl(ingestionUrl)
                .build();
        this.objectMapper = objectMapper;
    }

    @Override
    @Async
    public void streamChatResponse(ChatRequest request, SseEmitter emitter) {
        try {
            String requestBody = objectMapper.writeValueAsString(request);

            restClient.post()
                    .uri("/chat")
                    .header("Content-Type", "application/json")
                    .body(request)
                    .exchange((clientRequest, clientResponse) -> {

                        try (InputStream inputStream = clientResponse.getBody();
                             BufferedReader reader = new BufferedReader(
                                     new InputStreamReader(inputStream))) {

                            char[] buffer = new char[256];
                            int charsRead;

                            while ((charsRead = reader.read(buffer)) != -1) {
                                String token = new String(buffer, 0, charsRead);
                                if (!token.isEmpty()) {
                                    emitter.send(
                                            SseEmitter.event()
                                                    .data(token)
                                    );
                                }
                            }
                        }

                        emitter.complete();
                        return null;
                    });

        } catch (Exception e) {
            log.error("Chat streaming failed: {}", e.getMessage(), e);
            try {
                emitter.send(
                        SseEmitter.event()
                                .name("error")
                                .data("Chat failed: " + e.getMessage())
                );
                emitter.complete();
            } catch (Exception ex) {
                emitter.completeWithError(ex);
            }
        }
    }
}