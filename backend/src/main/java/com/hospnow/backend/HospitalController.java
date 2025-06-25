package com.hospnow.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController 
@RequestMapping("/api/hospitais") 
@CrossOrigin(origins = "*") 
public class HospitalController {

    @Autowired // Injeção de dependência
    private HospitalService hospitalService;

    // ROTA PARA LISTAR TODOS OS HOSPITAIS
    @GetMapping
    public List<Hospital> getHospitais() {
        return hospitalService.getAllHospitals();
    }

    // ROTA PARA CADASTRAR UM NOVO HOSPITAL 
    @PostMapping
    public Hospital createHospital(@RequestBody Hospital hospital) {
        return hospitalService.addHospital(hospital);
    }
}