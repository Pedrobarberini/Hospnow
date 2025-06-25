package com.hospnow.backend;

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service // Indica ao Spring que esta é uma classe de serviço (lógica de negócio)
public class HospitalService {

    // Nosso banco de dados em memória
    private final List<Hospital> hospitais = new ArrayList<>();
    // Um contador seguro para gerar novos IDs
    private final AtomicLong counter = new AtomicLong();

    // Bloco para inicializar com dados de exemplo
    public HospitalService() {
        Hospital h1 = new Hospital();
        h1.setId(counter.incrementAndGet());
        h1.setName("Hospital São Paulo");
        h1.setEndereco("Av. Paulista, 1000");
        h1.setLat(-23.5613);
        h1.setLng(-46.6565);
        h1.setSpecialties(List.of("Cardiologia"));
        hospitais.add(h1);

        Hospital h2 = new Hospital();
        h2.setId(counter.incrementAndGet());
        h2.setName("Clínica Bem-Estar");
        h2.setEndereco("Rua Augusta, 500");
        h2.setLat(-23.5539);
        h2.setLng(-46.6610);
        h2.setSpecialties(List.of("Ortopedia", "Dermatologia"));
        hospitais.add(h2);
    }

    // Método para retornar todos os hospitais
    public List<Hospital> getAllHospitals() {
        return hospitais;
    }

    // Método para adicionar um novo hospital
    public Hospital addHospital(Hospital hospital) {
        hospital.setId(counter.incrementAndGet()); // Gera um novo ID
        hospitais.add(hospital);
        return hospital;
    }
}