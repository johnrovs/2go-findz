package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ChangePasswordRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.response.LoginResponse;
import com.twogofindz.backend.entity.User;
import com.twogofindz.backend.repository.UserRepository;
import com.twogofindz.backend.security.JwtTokenProvider;
import com.twogofindz.backend.security.SecurityUser;
import com.twogofindz.backend.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                            JwtTokenProvider jwtTokenProvider,
                            UserRepository userRepository,
                            PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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

    @Override
    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsernameAndActiveTrue(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password."));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
