package com.hospnow.repository;

import com.hospnow.entity.Specialty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpecialtyRepository extends JpaRepository<Specialty, Long> {

    Optional<Specialty> findByNomeIgnoreCase(String nome);
}
