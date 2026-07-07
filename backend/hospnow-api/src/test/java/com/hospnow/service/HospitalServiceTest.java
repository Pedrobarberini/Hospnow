package com.hospnow.service;

import com.hospnow.entity.HealthPlan;
import com.hospnow.entity.Hospital;
import com.hospnow.repository.HospitalRepository;
import com.hospnow.util.HospitalOwnershipClassifier;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HospitalServiceTest {

    private final HospitalRepository repository = mock(HospitalRepository.class);
    private final HospitalService service = new HospitalService(repository);

    @Test
    void balancesPublicHospitalsWithNonPublicHospitalsBeforePagination() {
        when(repository.findOfficialHospitals()).thenReturn(List.of(
                publicHospital("Hospital Municipal A"),
                privateHospital("Hospital Privado A"),
                publicHospital("Hospital Municipal B"),
                publicHospital("Hospital Municipal C"),
                privateHospital("Hospital Privado B")
        ));

        Page<Hospital> result = service.buscarPaginado(
                null,
                null,
                null,
                null,
                PageRequest.of(0, 10)
        );

        assertThat(result.getTotalElements()).isEqualTo(4);
        assertThat(result.getContent()).filteredOn(this::isPublicHospital).hasSize(2);
        assertThat(result.getContent()).filteredOn(hospital -> !isPublicHospital(hospital)).hasSize(2);
    }

    @Test
    void keepsAllPublicHospitalsWhenPublicNetworkIsSelected() {
        when(repository.findOfficialHospitals()).thenReturn(List.of(
                publicHospital("Hospital Municipal A"),
                publicHospital("Hospital Municipal B"),
                publicHospital("Hospital Municipal C"),
                privateHospital("Hospital Privado A")
        ));

        Page<Hospital> result = service.buscarPaginado(
                "Rede Publica",
                null,
                null,
                null,
                PageRequest.of(0, 10)
        );

        assertThat(result.getTotalElements()).isEqualTo(3);
        assertThat(result.getContent()).allMatch(this::isPublicHospital);
    }

    private Hospital publicHospital(String name) {
        Hospital hospital = new Hospital();
        hospital.setNome(name);
        hospital.setEsferaAdministrativa("Municipal");
        hospital.setPlanos(List.of());
        return hospital;
    }

    private Hospital privateHospital(String name) {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Plano Exemplo");

        Hospital hospital = new Hospital();
        hospital.setNome(name);
        hospital.setCnpj("28290788000137");
        hospital.setPlanos(List.of(plan));
        return hospital;
    }

    private boolean isPublicHospital(Hospital hospital) {
        return HospitalOwnershipClassifier.PUBLIC.equals(HospitalOwnershipClassifier.classify(hospital));
    }
}
