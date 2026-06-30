package com.hospnow.controller;

import com.hospnow.dto.HospitalResponse;
import com.hospnow.dto.PagedResponse;
import com.hospnow.entity.Hospital;
import com.hospnow.service.HospitalService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    public PagedResponse<HospitalResponse> buscar(
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        PageRequest pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Direction.ASC, "nome")
        );

        return PagedResponse.from(
                service.buscarPaginado(plan, category, specialty, q, pageable)
                        .map(HospitalResponse::from)
        );
    }

    private List<HospitalResponse> toResponse(List<Hospital> hospitals) {
        return hospitals.stream()
                .map(HospitalResponse::from)
                .toList();
    }

}
