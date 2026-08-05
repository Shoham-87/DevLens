package com.sds.devlens;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class DevlensApplication {

	public static void main(String[] args) {
		SpringApplication.run(DevlensApplication.class, args);
	}

}
