package com.sds.devlens.services;

import com.sds.devlens.dto.ChatMessage;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface ChatStreamingService {
    void streamChat(String connectedRepoId, String question, List<ChatMessage> conversationHistory, SseEmitter emitter);
}
