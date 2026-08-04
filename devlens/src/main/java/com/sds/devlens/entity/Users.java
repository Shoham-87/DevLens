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

@Document(collection = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Users {

    @Id
    private String id;

    @Indexed(unique = true)
    @Field("github_id")
    private Long githubId;

    @Field("username")
    private String username;

    @Field("email_address")
    private String emailAddress;

    @Field("avatar_url")
    private String avatarUrl;

    @CreatedDate
    @Field("created_at")
    private Instant createdAt;

    @Field("last_login_at")
    private Instant lastLoginAt;

    @Field("github_access_token")
    private String githubAccessToken;

}
