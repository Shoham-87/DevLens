package com.sds.devlens.repository;

import com.sds.devlens.entity.Users;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsersRepository extends MongoRepository<Users,String> {
    Optional<Users> findByGithubId(Long githubId);
}
