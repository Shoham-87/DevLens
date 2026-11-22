package com.sds.devlens.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sds.devlens.dto.ChatMessage;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
public class ChatStreamingServiceImpl implements ChatStreamingService {

    private static final int READ_BUFFER_SIZE = 256;

    private final String chatUrl;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final ExecutorService executorService;

    public ChatStreamingServiceImpl(@Value("${devlens.ingestion.url}") String chatUrl, ObjectMapper objectMapper) {
        this.chatUrl = chatUrl;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();
    }

    @Override
    public void streamChat(String connectedRepoId, String question, List<ChatMessage> conversationHistory, SseEmitter emitter) {
        executorService.submit(() -> relayChat(connectedRepoId, question, conversationHistory, emitter));
    }

    private void relayChat(String connectedRepoId, String question, List<ChatMessage> conversationHistory, SseEmitter emitter) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("connectedRepoId", connectedRepoId);
            payload.put("question", question);
            payload.put("conversationHistory", conversationHistory);
            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(chatUrl + "/chat"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<java.io.InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

            if (response.statusCode() != 200) {
                emitter.completeWithError(new IOException("Chat service returned status " + response.statusCode()));
                return;
            }

            try (Reader reader = new InputStreamReader(response.body(), StandardCharsets.UTF_8)) {
                char[] buffer = new char[READ_BUFFER_SIZE];
                int charsRead;
                while ((charsRead = reader.read(buffer)) != -1) {
                    String token = new String(buffer, 0, charsRead);
                    emitter.send(SseEmitter.event().name("token").data(token));
                }
            }

            emitter.send(SseEmitter.event().name("done").data(""));
            emitter.complete();
        } catch (Exception e) {
            log.error("Chat stream relay failed for repo {}", connectedRepoId, e);
            emitter.completeWithError(e);
        }
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdown();
    }
}
