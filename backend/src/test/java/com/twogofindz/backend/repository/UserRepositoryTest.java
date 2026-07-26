package com.twogofindz.backend.repository;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class UserRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void seededAdminUserExistsWithHashedPassword() {
        Optional<User> found = userRepository.findByUsernameAndActiveTrue("johnrovs");

        assertThat(found).isPresent();
        User admin = found.get();
        assertThat(admin.getFullName()).isEqualTo("John Rommel Rovero");
        assertThat(admin.getRole()).isEqualTo("ADMIN");
        assertThat(new BCryptPasswordEncoder().matches("admin123", admin.getPasswordHash())).isTrue();
    }

    @Test
    void findByUsernameAndActiveTrue_returnsEmpty_whenUsernameUnknown() {
        assertThat(userRepository.findByUsernameAndActiveTrue("nobody")).isEmpty();
    }
}
