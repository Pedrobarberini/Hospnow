package com.hospnow.controller;

import com.hospnow.entity.HealthPlan;
import com.hospnow.repository.HealthPlanRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/plans")
public class HealthPlanController {

    private final HealthPlanRepository repository;

    public HealthPlanController(HealthPlanRepository repository) {
        this.repository = repository;
    }

    @PostMapping
    public HealthPlan criar(@RequestBody HealthPlan plan) {
        return repository.save(plan);
    }

    @GetMapping
    public List<HealthPlan> listar() {
        return repository.findAll();
    }
}