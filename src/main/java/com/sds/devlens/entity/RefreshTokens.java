package com.sds.devlens.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Document(collection = "refreshTokens")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class RefreshTokens{

    @Id
    private String id;

    @Indexed(unique = true)
    @Field("refresh_token_value")
    private String refreshTokenValue;

    @Indexed
    @Field("user_id")
    private String userId;

    @Field("expires_at")
    private Instant expiresAt;

    @CreatedDate
    @Field("created_at")
    private Instant createdAt;

    @Field("revoked")
    private boolean revoked =false;
}