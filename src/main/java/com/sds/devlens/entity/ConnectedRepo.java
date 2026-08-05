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

@Document(collection = "connectedRepo")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConnectedRepo {

    @Id
    private String id;

    @Indexed
    @Field("user_id")
    private String userId;

    @Field("github_repo_id")
    private Long githubRepoId;

    @Field("name")
    private String name;

    @Field("repo_url")
    private String repoUrl;

    @Field("language")
    private String language;

    @Field("status")
    private String status;

    @Field("progress_percent")
    private int progressPercent = 0;

    @Field("files_processed")
    private int filesProcessed = 0;

    @Field("total_files")
    private int totalFiles = 0;

    @Field("chunks_created")
    private int chunksCreated = 0;

    @CreatedDate
    @Field("connected_at")
    private Instant connectedAt;
}
