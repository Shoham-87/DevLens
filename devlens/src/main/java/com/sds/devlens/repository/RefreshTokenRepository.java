package com.sds.devlens.repository;

import com.sds.devlens.entity.RefreshTokens;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends MongoRepository<RefreshTokens,String> {
    RefreshTokens findByUserId(String userId);
    void deleteByUserId(String userId);
    Optional<RefreshTokens> findByRefreshTokenValue(String refreshTokenValue);

    @Query("{ 'refresh_token_value': ?0 }")
    @Update(" { '$set' : {'revoked' :  true }}")
    void revokeByRefreshTokenValue(String refreshTokenValue);
}
