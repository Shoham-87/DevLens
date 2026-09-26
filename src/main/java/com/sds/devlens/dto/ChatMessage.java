package com.sds.devlens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @NotBlank(message = "role cannot be empty")
    private String role;

    @NotBlank(message = "content cannot be empty")
    private String content;
}
