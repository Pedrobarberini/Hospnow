package com.hospnow.config;

import com.hospnow.entity.HealthPlan;
import com.hospnow.entity.Hospital;
import com.hospnow.entity.Specialty;
import com.hospnow.repository.HealthPlanRepository;
import com.hospnow.repository.HospitalRepository;
import com.hospnow.repository.SpecialtyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final HealthPlanRepository healthPlanRepository;
    private final HospitalRepository hospitalRepository;
    private final SpecialtyRepository specialtyRepository;

    public DataSeeder(
            HealthPlanRepository healthPlanRepository,
            HospitalRepository hospitalRepository,
            SpecialtyRepository specialtyRepository
    ) {
        this.healthPlanRepository = healthPlanRepository;
        this.hospitalRepository = hospitalRepository;
        this.specialtyRepository = specialtyRepository;
    }

    @Override
    public void run(String... args) {
        HealthPlan unimed = findOrCreatePlan("Unimed");
        HealthPlan bradesco = findOrCreatePlan("Bradesco");
        HealthPlan sulAmerica = findOrCreatePlan("SulAmérica");
        HealthPlan amil = findOrCreatePlan("Amil");
        HealthPlan notreDame = findOrCreatePlan("NotreDame Intermédica");
        HealthPlan portoSeguro = findOrCreatePlan("Porto Seguro Saúde");

        Specialty prontoAtendimento = findOrCreateSpecialty("Pronto atendimento");
        Specialty pediatria = findOrCreateSpecialty("Pediatria");
        Specialty cardiologia = findOrCreateSpecialty("Cardiologia");
        Specialty ortopedia = findOrCreateSpecialty("Ortopedia");
        Specialty ginecologia = findOrCreateSpecialty("Ginecologia");
        Specialty dermatologia = findOrCreateSpecialty("Dermatologia");
        Specialty exames = findOrCreateSpecialty("Exames laboratoriais");

        normalizeLegacyHospitals(List.of(prontoAtendimento, cardiologia));

        createOrUpdateHospital(
                "Hospital Family Taboão",
                "Rua do Tesouro, 340 - Jardim Maria Rosa, Taboão da Serra - SP",
                "(11) 4138-9000",
                -23.6068,
                -46.7581,
                List.of(unimed, bradesco, notreDame),
                List.of(prontoAtendimento, pediatria, ortopedia, exames)
        );

        createOrUpdateHospital(
                "Clínica Central Taboão",
                "Av. Dr. José Maciel, 560 - Centro, Taboão da Serra - SP",
                "(11) 4788-2100",
                -23.6019,
                -46.7525,
                List.of(amil, sulAmerica, portoSeguro),
                List.of(pediatria, ginecologia, dermatologia, exames)
        );

        createOrUpdateHospital(
                "Hospital São Luiz Morumbi",
                "Rua Eng. Oscar Americano, 840 - Morumbi, São Paulo - SP",
                "(11) 3093-1100",
                -23.5957,
                -46.7108,
                List.of(unimed, bradesco, sulAmerica, portoSeguro),
                List.of(prontoAtendimento, cardiologia, ortopedia, pediatria)
        );

        createOrUpdateHospital(
                "Hospital Leforte Morumbi",
                "Rua dos Três Irmãos, 121 - Morumbi, São Paulo - SP",
                "(11) 3723-6800",
                -23.6092,
                -46.7272,
                List.of(bradesco, amil, notreDame),
                List.of(prontoAtendimento, cardiologia, ortopedia)
        );

        createOrUpdateHospital(
                "Hospital Albert Einstein",
                "Av. Albert Einstein, 627 - Morumbi, São Paulo - SP",
                "(11) 2151-1233",
                -23.5993,
                -46.7151,
                List.of(bradesco, sulAmerica, portoSeguro),
                List.of(cardiologia, ortopedia, dermatologia, exames)
        );

        createOrUpdateHospital(
                "Hospital Santa Paula",
                "Av. Santo Amaro, 2468 - Vila Olímpia, São Paulo - SP",
                "(11) 3040-8000",
                -23.5954,
                -46.6779,
                List.of(unimed, amil, sulAmerica),
                List.of(prontoAtendimento, cardiologia, ginecologia)
        );

        createOrUpdateHospital(
                "Hospital São Camilo Pompeia",
                "Av. Pompeia, 1178 - Pompeia, São Paulo - SP",
                "(11) 3677-4444",
                -23.5273,
                -46.6849,
                List.of(unimed, bradesco, portoSeguro),
                List.of(prontoAtendimento, pediatria, cardiologia)
        );

        createOrUpdateHospital(
                "Hospital Nove de Julho",
                "Rua Peixoto Gomide, 625 - Bela Vista, São Paulo - SP",
                "(11) 3147-9999",
                -23.5607,
                -46.6572,
                List.of(bradesco, sulAmerica, amil),
                List.of(prontoAtendimento, cardiologia, ortopedia, exames)
        );

        createOrUpdateHospital(
                "Hospital Sepaco",
                "Rua Vergueiro, 4210 - Vila Mariana, São Paulo - SP",
                "(11) 2182-8000",
                -23.5893,
                -46.6355,
                List.of(unimed, notreDame, amil),
                List.of(prontoAtendimento, pediatria, ginecologia, exames)
        );

        createOrUpdateHospital(
                "Hospital Sancta Maggiore Itaim",
                "Rua Joaquim Floriano, 533 - Itaim Bibi, São Paulo - SP",
                "(11) 3053-6611",
                -23.5849,
                -46.6782,
                List.of(notreDame, amil),
                List.of(cardiologia, dermatologia, exames)
        );
    }

    private HealthPlan findOrCreatePlan(String nome) {
        return healthPlanRepository.findByNomeIgnoreCase(nome)
                .orElseGet(() -> {
                    HealthPlan plan = new HealthPlan();
                    plan.setNome(nome);
                    return healthPlanRepository.save(plan);
                });
    }

    private Specialty findOrCreateSpecialty(String nome) {
        return specialtyRepository.findByNomeIgnoreCase(nome)
                .orElseGet(() -> {
                    Specialty specialty = new Specialty();
                    specialty.setNome(nome);
                    return specialtyRepository.save(specialty);
                });
    }

    private void createOrUpdateHospital(
            String nome,
            String endereco,
            String telefone,
            Double latitude,
            Double longitude,
            List<HealthPlan> planos,
            List<Specialty> especialidades
    ) {
        Hospital hospital = hospitalRepository.findByNomeIgnoreCase(nome)
                .orElseGet(Hospital::new);

        hospital.setNome(nome);
        hospital.setEndereco(endereco);
        hospital.setTelefone(telefone);
        hospital.setLatitude(latitude);
        hospital.setLongitude(longitude);
        hospital.setPlanos(planos);
        hospital.setEspecialidades(especialidades);

        hospitalRepository.save(hospital);
    }

    private void normalizeLegacyHospitals(List<Specialty> especialidades) {
        hospitalRepository.findAll().stream()
                .filter(hospital -> hospital.getNome() == null || hospital.getNome().isBlank())
                .forEach(hospital -> {
                    hospital.setNome("Hospital São Lucas");

                    if (hospital.getTelefone() == null || hospital.getTelefone().isBlank()) {
                        hospital.setTelefone("(11) 99999-9999");
                    }

                    hospital.setEspecialidades(especialidades);
                    hospitalRepository.save(hospital);
                });
    }
}
