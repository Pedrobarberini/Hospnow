package com.hospnow.controller;

import com.hospnow.entity.Hospital;
import com.hospnow.service.HospitalService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/hospitals")
public class HospitalController {

    private final HospitalService service;

    public HospitalController(HospitalService service){
        this.service = service;
    }

    @PostMapping
    public Hospital criar(@RequestBody Hospital hospital){
        return service.salvar(hospital);
    }

    @GetMapping
    public List<Hospital> listar(){
        return service.listar();
    }

    @GetMapping("/plan/{nomePlano}")
    public List<Hospital> buscarPorPlano(@PathVariable String nomePlano) {
        return service.buscarPorPlano(nomePlano);
    }

    @GetMapping("/specialty/{nomeEspecialidade}")
    public List<Hospital> buscarPorEspecialidade(@PathVariable String nomeEspecialidade) {
        return service.buscarPorEspecialidade(nomeEspecialidade);
    }

    @GetMapping("/search")
    public List<Hospital> buscar(
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) String specialty
    ) {
        return service.buscar(plan, specialty);
    }

}
