package com.sds.devlens.utility;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    @Value("${devlens.jwt.access-token-time-span}")
    private long accessTokenSpanInMs;

    @Value("${devlens.jwt.refresh-token-time-span}")
    private long refreshTokenSpanInMs;

    @Value("${devlens.jwt.secret-key}")
    private String jwtSecret;

    public String generateAccessToken(String userId,Long githubId){
        return Jwts.builder()
                .subject(userId)
                .claim("githubId",githubId)
                .claim("type","access")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis()+ accessTokenSpanInMs) )
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    public String generateRefreshToken(String userId){
        return Jwts.builder()
                .subject(userId)
                .claim("type","refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis()+ refreshTokenSpanInMs) )
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    private SecretKey getSigningKey(){
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }


    private Claims getParsedClams(String token){
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build().parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = getParsedClams(token);
            return claims.getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public String extractUserId(String token) {
        return getParsedClams(token).getSubject();
    }

    public Long extractGithubId(String token) {
        Object value = getParsedClams(token).get("githubId");
        return value != null ? Long.valueOf(value.toString()) : null;
    }

    public String extractTokenType(String token) {
        return getParsedClams(token).get("type", String.class);
    }

}
