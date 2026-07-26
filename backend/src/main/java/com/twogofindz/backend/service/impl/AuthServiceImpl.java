package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.response.LoginResponse;
import com.twogofindz.backend.security.JwtTokenProvider;
import com.twogofindz.backend.security.SecurityUser;
import com.twogofindz.backend.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthServiceImpl(AuthenticationManager authenticationManager, JwtTokenProvider jwtTokenProvider) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        SecurityUser principal = (SecurityUser) authentication.getPrincipal();
        String role = principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        String token = jwtTokenProvider.generateToken(principal.getUsername(), role);

        return new LoginResponse(token, principal.getUsername(), principal.getFullName(), role);
    }
}
