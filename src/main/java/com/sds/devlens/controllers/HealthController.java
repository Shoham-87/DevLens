package com.sds.devlens.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/devlens/health")
public class HealthController {

    @GetMapping("/check")
    public ResponseEntity<String> healthCheck(){
        return ResponseEntity.ok("{\"status\": \"UP\"}");
    }
}
