package com.sds.devlens.services;

import com.sds.devlens.dto.ChatRequest;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface ChatService {

    void streamChatResponse(ChatRequest request, SseEmitter emitter);
}