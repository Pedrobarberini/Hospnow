package com.hospnow.backend;

import lombok.Data;
import java.util.List;

@Data 
public class Hospital {
    private long id;
    private String name;
    private String endereco;
    private double lat;
    private double lng;
    private List<String> specialties;
}