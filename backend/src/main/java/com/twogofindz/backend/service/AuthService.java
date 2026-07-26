package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ChangePasswordRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.response.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
    void changePassword(String username, ChangePasswordRequest request);
}
