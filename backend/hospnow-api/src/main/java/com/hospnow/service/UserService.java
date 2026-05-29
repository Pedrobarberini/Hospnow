package com.hospnow.service;

import com.hospnow.dto.UserRequestDTO;
import com.hospnow.entity.User;
import com.hospnow.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository repository;

    public UserService(UserRepository repository){

        this.repository = repository;
    }

    public User salvar(UserRequestDTO dto) {

        User user = new User();

        user.setNome(dto.getNome());
        user.setEmail(dto.getEmail());

        return repository.save(user);
    }

    public List<User> listar() {
        return repository.findAll();
    }
}
