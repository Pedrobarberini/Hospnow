package com.hospnow.controller;

import com.hospnow.dto.SpecialtyResponse;
import com.hospnow.entity.Specialty;
import com.hospnow.repository.SpecialtyRepository;
import com.hospnow.util.HospitalSpecialtyCatalog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.text.Collator;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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
    public List<SpecialtyResponse> listar() {
        Map<String, SpecialtyResponse> specialtiesByName = new LinkedHashMap<>();

        repository.findAll().forEach(specialty -> specialtiesByName.put(
                specialtyKey(specialty.getNome()),
                SpecialtyResponse.from(specialty)
        ));

        HospitalSpecialtyCatalog.allSpecialtyNames().forEach(name -> specialtiesByName.putIfAbsent(
                specialtyKey(name),
                new SpecialtyResponse(syntheticId(name), name)
        ));

        Collator collator = Collator.getInstance(Locale.forLanguageTag("pt-BR"));

        return new ArrayList<>(specialtiesByName.values()).stream()
                .sorted((first, second) -> collator.compare(first.nome(), second.nome()))
                .toList();
    }

    private static String specialtyKey(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static Long syntheticId(String value) {
        long hash = Math.abs((long) specialtyKey(value).hashCode());
        return hash == 0 ? -1L : -hash;
    }
}
