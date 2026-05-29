package com.hospnow.controller;

import com.hospnow.entity.Specialty;
import com.hospnow.repository.SpecialtyRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/specialties")
public class SpecialtyController {

    private final SpecialtyRepository repository;

    public SpecialtyController(SpecialtyRepository repository) {
        this.repository = repository;
    }

    @PostMapping
    public Specialty criar(@RequestBody Specialty specialty) {
        return repository.save(specialty);
    }

    @GetMapping
    public List<Specialty> listar() {
        return repository.findAll();
    }
}
