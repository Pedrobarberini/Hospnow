package com.hospnow.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class ApiStatusController {

    @GetMapping({"/", "/health"})
    public Map<String, Object> status() {
        return Map.of(
                "name", "HospNow API",
                "status", "online",
                "endpoints", List.of("/hospitals", "/hospitals/search", "/plans", "/specialties")
        );
    }
}
