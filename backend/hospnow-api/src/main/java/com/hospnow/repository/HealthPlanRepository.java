package com.hospnow.repository;

import com.hospnow.entity.HealthPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HealthPlanRepository extends JpaRepository<HealthPlan, Long> {

    Optional<HealthPlan> findByNomeIgnoreCase(String nome);

    Optional<HealthPlan> findByCodigoAnsPlano(String codigoAnsPlano);

    List<HealthPlan> findByFonteDadosIgnoreCase(String fonteDados);
}
