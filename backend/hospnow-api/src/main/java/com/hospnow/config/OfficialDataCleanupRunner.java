package com.hospnow.config;

import com.hospnow.entity.HealthPlan;
import com.hospnow.entity.Hospital;
import com.hospnow.entity.Specialty;
import com.hospnow.repository.HealthPlanRepository;
import com.hospnow.repository.HospitalRepository;
import com.hospnow.repository.SpecialtyRepository;
import com.hospnow.util.HospitalSpecialtyCatalog;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class OfficialDataCleanupRunner implements CommandLineRunner {

    private final boolean cleanupDemoRecords;
    private final HealthPlanRepository healthPlanRepository;
    private final HospitalRepository hospitalRepository;
    private final SpecialtyRepository specialtyRepository;

    public OfficialDataCleanupRunner(
            @Value("${app.data.cleanup-demo-records:true}") boolean cleanupDemoRecords,
            HealthPlanRepository healthPlanRepository,
            HospitalRepository hospitalRepository,
            SpecialtyRepository specialtyRepository
    ) {
        this.cleanupDemoRecords = cleanupDemoRecords;
        this.healthPlanRepository = healthPlanRepository;
        this.hospitalRepository = hospitalRepository;
        this.specialtyRepository = specialtyRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (cleanupDemoRecords) {
            removeNonOfficialHospitals();
            removeLegacyManualPlans();
        }

        applyOfficialSpecialtyCatalog();
    }

    private void removeNonOfficialHospitals() {
        List<Hospital> nonOfficialHospitals = hospitalRepository.findAll().stream()
                .filter(hospital -> isBlank(hospital.getCodigoCnes()) || !sameText(hospital.getFonteDados(), "CNES"))
                .toList();

        if (nonOfficialHospitals.isEmpty()) {
            return;
        }

        nonOfficialHospitals.forEach(hospital -> {
            hospital.setPlanos(new ArrayList<>());
            hospital.setEspecialidades(new ArrayList<>());
        });
        hospitalRepository.deleteAll(nonOfficialHospitals);
        hospitalRepository.flush();
    }

    private void removeLegacyManualPlans() {
        List<HealthPlan> legacyPlans = healthPlanRepository.findAll().stream()
                .filter(plan -> isBlank(plan.getFonteDados()))
                .toList();

        if (!legacyPlans.isEmpty()) {
            Set<Long> legacyPlanIds = legacyPlans.stream()
                    .map(HealthPlan::getId)
                    .collect(java.util.stream.Collectors.toSet());

            hospitalRepository.findAll().forEach(hospital -> {
                if (hospital.getPlanos() == null) {
                    return;
                }

                List<HealthPlan> retainedPlans = hospital.getPlanos().stream()
                        .filter(plan -> plan.getId() == null || !legacyPlanIds.contains(plan.getId()))
                        .toList();

                if (retainedPlans.size() != hospital.getPlanos().size()) {
                    hospital.setPlanos(new ArrayList<>(retainedPlans));
                    hospitalRepository.save(hospital);
                }
            });
            hospitalRepository.flush();
            healthPlanRepository.deleteAll(legacyPlans);
            healthPlanRepository.flush();
        }
    }

    private void applyOfficialSpecialtyCatalog() {
        hospitalRepository.findAll().stream()
                .filter(hospital -> !isBlank(hospital.getCodigoCnes()))
                .filter(hospital -> sameText(hospital.getFonteDados(), "CNES"))
                .forEach(hospital -> {
                    List<Specialty> specialties = hospital.getEspecialidades() == null
                            ? new ArrayList<>()
                            : new ArrayList<>(hospital.getEspecialidades());
                    boolean changed = false;

                    for (String specialtyName : HospitalSpecialtyCatalog.specialtyNamesFor(hospital)) {
                        if (hasSpecialty(specialties, specialtyName)) {
                            continue;
                        }

                        specialties.add(findOrCreateSpecialty(specialtyName));
                        changed = true;
                    }

                    if (changed) {
                        hospital.setEspecialidades(specialties);
                        hospitalRepository.save(hospital);
                    }
                });
    }

    private Specialty findOrCreateSpecialty(String name) {
        return specialtyRepository.findByNomeIgnoreCase(name)
                .orElseGet(() -> {
                    Specialty specialty = new Specialty();
                    specialty.setNome(name);
                    return specialtyRepository.save(specialty);
                });
    }

    private static boolean hasSpecialty(List<Specialty> specialties, String name) {
        return specialties.stream().anyMatch(specialty -> sameText(specialty.getNome(), name));
    }

    private static boolean sameText(String first, String second) {
        return first != null && second != null && first.equalsIgnoreCase(second);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
