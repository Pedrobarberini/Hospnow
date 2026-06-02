package com.hospnow.service;

import com.hospnow.entity.Hospital;
import com.hospnow.repository.HospitalRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HospitalService {

    private final HospitalRepository repository;

    public HospitalService(HospitalRepository repository){
        this.repository = repository;
    }

    public Hospital salvar(Hospital hospital){
        return repository.save(hospital);
    }

    public List<Hospital> listar(){
        return repository.findAll();
    }

    public List<Hospital> buscarPorPlano(String nomePlano){
        return repository.findByPlanosNomeIgnoreCase(nomePlano);
    }

    public List<Hospital> buscarPorEspecialidade(String nomeEspecialidade){
        return repository.findByEspecialidadesNomeIgnoreCase(nomeEspecialidade);
    }

    public List<Hospital> buscar(String nomePlano, String nomeEspecialidade){
        return buscar(nomePlano, nomeEspecialidade, null);
    }

    public List<Hospital> buscar(String nomePlano, String nomeEspecialidade, String termoBusca){
        String plano = nomePlano == null || nomePlano.isBlank() ? null : nomePlano;
        String especialidade = nomeEspecialidade == null || nomeEspecialidade.isBlank()
                ? null
                : nomeEspecialidade;
        String busca = termoBusca == null || termoBusca.isBlank() ? null : termoBusca.trim();

        if (plano == null && especialidade == null && busca == null) {
            return listar();
        }

        if (plano != null && especialidade == null && busca == null) {
            return buscarPorPlano(plano);
        }

        if (plano == null && busca == null) {
            return buscarPorEspecialidade(especialidade);
        }

        return repository.search(plano, especialidade, busca);
    }

}
