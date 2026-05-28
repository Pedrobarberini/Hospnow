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
    
}
