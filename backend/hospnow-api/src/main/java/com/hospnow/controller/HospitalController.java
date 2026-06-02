package com.hospnow.controller;

import com.hospnow.dto.HospitalResponse;
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
    public List<HospitalResponse> listar(){
        return toResponse(service.listar());
    }

    @GetMapping("/plan/{nomePlano}")
    public List<HospitalResponse> buscarPorPlano(@PathVariable String nomePlano) {
        return toResponse(service.buscarPorPlano(nomePlano));
    }

    @GetMapping("/specialty/{nomeEspecialidade}")
    public List<HospitalResponse> buscarPorEspecialidade(@PathVariable String nomeEspecialidade) {
        return toResponse(service.buscarPorEspecialidade(nomeEspecialidade));
    }

    @GetMapping("/search")
    public List<HospitalResponse> buscar(
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String q
    ) {
        return toResponse(service.buscar(plan, specialty, q));
    }

    private List<HospitalResponse> toResponse(List<Hospital> hospitals) {
        return hospitals.stream()
                .map(HospitalResponse::from)
                .toList();
    }

}
