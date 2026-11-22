package com.sds.devlens.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    private String connectedRepoId;

    private String question;

    private List<Map<String, String>> conversationHistory = List.of();
}