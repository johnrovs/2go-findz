package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ChangePasswordRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.response.LoginResponse;
import com.twogofindz.backend.entity.User;
import com.twogofindz.backend.exception.AccountLockedException;
import com.twogofindz.backend.repository.UserRepository;
import com.twogofindz.backend.security.JwtTokenProvider;
import com.twogofindz.backend.security.SecurityUser;
import com.twogofindz.backend.service.AuthService;
import com.twogofindz.backend.service.LoginAttemptService;
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
    private final LoginAttemptService loginAttemptService;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                            JwtTokenProvider jwtTokenProvider,
                            UserRepository userRepository,
                            PasswordEncoder passwordEncoder,
                            LoginAttemptService loginAttemptService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptService = loginAttemptService;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        if (loginAttemptService.isLocked(request.username())) {
            throw new AccountLockedException(
                    "Too many failed login attempts. Please try again in a few minutes.");
        }

        SecurityUser principal;
        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
            principal = (SecurityUser) authentication.getPrincipal();
        } catch (BadCredentialsException ex) {
            loginAttemptService.recordFailure(request.username());
            throw ex;
        }

        loginAttemptService.recordSuccess(request.username());
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
