package com.hospnow.controller;

import com.hospnow.dto.UserRequestDTO;
import com.hospnow.entity.User;
import com.hospnow.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {

        this.service = service;
    }
    @PostMapping
    public User criar(@RequestBody @Valid UserRequestDTO dto) {
        return service.salvar(dto);
    }
    

    @GetMapping
    public List<User> listar() {
        return service.listar();
    }
    
}
