package com.hospnow.backend;

import org.springframework.beans.factory.annotation.*;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@CrossOrigin(origins = "*") 
@RestController 

public class HospnowController {
    private List<Hospital> hospitais = new ArrayList<>();
    public HospnowController() {
        hospitais.add( new Hospital(1, "Hospital Santa Catarina",
                "(11)3016-4133", -23.56965417382238, -46.645331741825686, "avenida Angélica, 1234" ));
        hospitais.add( new Hospital(2, "Hospital São Luiz",
                "(11)3040-1100", -23.590700507868586, -46.67351845302187, "avenida Indianópolis, 5678" ));
    }

    @GetMapping("/hospital")
    public List<Hospital> getHospitais() {
        return hospitais;
    }

    @PostMapping("/hospital")
    public String adicionarHospital(
            @RequestBody Hospital hospital
    ) {
        hospitais.add(hospital);
        return "Hospital adicionado com sucesso";

    }
}
