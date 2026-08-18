package com.twogofindz.backend.service.impl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceImplTest {

    @Test
    void isLocked_isFalse_beforeAnyFailures() {
        LoginAttemptServiceImpl service = new LoginAttemptServiceImpl();

        assertThat(service.isLocked("someone")).isFalse();
    }

    @Test
    void isLocked_isFalse_afterFewerThanMaxFailures() {
        LoginAttemptServiceImpl service = new LoginAttemptServiceImpl();

        for (int i = 0; i < 4; i++) {
            service.recordFailure("someone");
        }

        assertThat(service.isLocked("someone")).isFalse();
    }

    @Test
    void isLocked_becomesTrue_afterMaxFailures() {
        LoginAttemptServiceImpl service = new LoginAttemptServiceImpl();

        for (int i = 0; i < 5; i++) {
            service.recordFailure("someone");
        }

        assertThat(service.isLocked("someone")).isTrue();
    }

    @Test
    void lockout_isKeyedByNormalizedUsername_soCasingAndWhitespaceDoNotBypassIt() {
        LoginAttemptServiceImpl service = new LoginAttemptServiceImpl();

        for (int i = 0; i < 5; i++) {
            service.recordFailure("  Someone@Example.com  ");
        }

        assertThat(service.isLocked("someone@example.com")).isTrue();
    }

    @Test
    void differentUsername_isUnaffected_byAnotherUsernamesLockout() {
        LoginAttemptServiceImpl service = new LoginAttemptServiceImpl();

        for (int i = 0; i < 5; i++) {
            service.recordFailure("attacker-target");
        }

        assertThat(service.isLocked("someone-else")).isFalse();
    }

    @Test
    void recordSuccess_resetsFailureCount_soLockoutRequiresAFreshRunOfFailures() {
        LoginAttemptServiceImpl service = new LoginAttemptServiceImpl();

        for (int i = 0; i < 4; i++) {
            service.recordFailure("someone");
        }
        service.recordSuccess("someone");

        for (int i = 0; i < 4; i++) {
            service.recordFailure("someone");
        }

        assertThat(service.isLocked("someone")).isFalse();
    }
}
