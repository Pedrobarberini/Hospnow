package com.hospnow.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController 
@RequestMapping("/api/hospitais") 
@CrossOrigin(origins = "*") 
public class HospitalController {

    @Autowired // Injeção de dependência: O Spring nos dará uma instância do HospitalService
    private HospitalService hospitalService;

    // ROTA PARA LISTAR TODOS OS HOSPITAIS (GET /api/hospitais)
    @GetMapping
    public List<Hospital> getHospitais() {
        return hospitalService.getAllHospitals();
    }

    // ROTA PARA CADASTRAR UM NOVO HOSPITAL (POST /api/hospitais)
    @PostMapping
    public Hospital createHospital(@RequestBody Hospital hospital) {
        return hospitalService.addHospital(hospital);
    }
}