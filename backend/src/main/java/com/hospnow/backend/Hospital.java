package com.hospnow.backend;


public record Hospital( 

        long id,
        String nome,
        String telefone,
        double latitude,
        double longitude,
        String endereco
){}
