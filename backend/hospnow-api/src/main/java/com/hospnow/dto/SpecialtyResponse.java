package com.hospnow.dto;

import com.hospnow.entity.Specialty;

public record SpecialtyResponse(
        Long id,
        String nome
) {
    public static SpecialtyResponse from(Specialty specialty) {
        return new SpecialtyResponse(specialty.getId(), specialty.getNome());
    }
}
