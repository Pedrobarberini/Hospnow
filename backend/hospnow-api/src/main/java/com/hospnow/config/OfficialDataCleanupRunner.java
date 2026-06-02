package com.hospnow.config;

import com.hospnow.entity.HealthPlan;
import com.hospnow.entity.Hospital;
import com.hospnow.entity.Specialty;
import com.hospnow.repository.HealthPlanRepository;
import com.hospnow.repository.HospitalRepository;
import com.hospnow.repository.SpecialtyRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class OfficialDataCleanupRunner implements CommandLineRunner {

    private static final Set<String> LEGACY_SPECIALTIES = Set.of(
            "PRONTO ATENDIMENTO",
            "PEDIATRIA",
            "CARDIOLOGIA",
            "ORTOPEDIA",
            "GINECOLOGIA",
            "DERMATOLOGIA",
            "EXAMES LABORATORIAIS"
    );

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
        if (!cleanupDemoRecords) {
            return;
        }

        removeNonOfficialHospitals();
        removeLegacyManualPlans();
        removeLegacySpecialties();
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

    private void removeLegacySpecialties() {
        List<Specialty> legacySpecialties = specialtyRepository.findAll().stream()
                .filter(specialty -> LEGACY_SPECIALTIES.contains(normalizeForComparison(specialty.getNome())))
                .toList();

        if (!legacySpecialties.isEmpty()) {
            Set<Long> legacySpecialtyIds = legacySpecialties.stream()
                    .map(Specialty::getId)
                    .collect(java.util.stream.Collectors.toSet());

            hospitalRepository.findAll().forEach(hospital -> {
                if (hospital.getEspecialidades() == null) {
                    return;
                }

                List<Specialty> retainedSpecialties = hospital.getEspecialidades().stream()
                        .filter(specialty -> specialty.getId() == null || !legacySpecialtyIds.contains(specialty.getId()))
                        .toList();

                if (retainedSpecialties.size() != hospital.getEspecialidades().size()) {
                    hospital.setEspecialidades(new ArrayList<>(retainedSpecialties));
                    hospitalRepository.save(hospital);
                }
            });
            hospitalRepository.flush();
            specialtyRepository.deleteAll(legacySpecialties);
            specialtyRepository.flush();
        }
    }

    private static String normalizeForComparison(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .trim();
    }

    private static boolean sameText(String first, String second) {
        return first != null && second != null && first.equalsIgnoreCase(second);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
