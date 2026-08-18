package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.service.LoginAttemptService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory login lockout tracker, keyed by the raw submitted username (normalized), not by
 * whether the account actually exists. This keeps lockout behavior symmetric for real and
 * fake usernames so it cannot be used to enumerate valid accounts.
 */
@Service
public class LoginAttemptServiceImpl implements LoginAttemptService {

    private static final Logger log = LoggerFactory.getLogger(LoginAttemptServiceImpl.class);

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MS = 15 * 60 * 1000L;

    private final ConcurrentHashMap<String, Attempts> attemptsByUsername = new ConcurrentHashMap<>();

    @Override
    public boolean isLocked(String username) {
        Attempts attempts = attemptsByUsername.get(normalize(username));
        return attempts != null && attempts.isLocked();
    }

    @Override
    public void recordFailure(String username) {
        String key = normalize(username);
        Attempts attempts = attemptsByUsername.computeIfAbsent(key, k -> new Attempts());
        boolean justLocked = attempts.registerFailure(MAX_ATTEMPTS, LOCKOUT_DURATION_MS);
        if (justLocked) {
            log.warn("Login lockout triggered for username='{}' at {} (UTC)", key, Instant.now());
        } else {
            log.info("Failed login attempt for username='{}' at {} (UTC)", key, Instant.now());
        }
    }

    @Override
    public void recordSuccess(String username) {
        String key = normalize(username);
        attemptsByUsername.remove(key);
        log.info("Successful login for username='{}' at {} (UTC)", key, Instant.now());
    }

    private String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }

    /**
     * Mutable per-username failure counter. All access is synchronized on the instance itself;
     * {@link ConcurrentHashMap#computeIfAbsent} guarantees a single shared instance per key.
     */
    private static final class Attempts {
        private int count = 0;
        private Instant lockedUntil;

        synchronized boolean isLocked() {
            if (lockedUntil == null) {
                return false;
            }
            if (Instant.now().isAfter(lockedUntil)) {
                lockedUntil = null;
                count = 0;
                return false;
            }
            return true;
        }

        /** @return true if this failure just triggered a new lockout. */
        synchronized boolean registerFailure(int maxAttempts, long lockoutDurationMs) {
            if (lockedUntil != null && Instant.now().isAfter(lockedUntil)) {
                lockedUntil = null;
                count = 0;
            }
            count++;
            if (count >= maxAttempts && lockedUntil == null) {
                lockedUntil = Instant.now().plusMillis(lockoutDurationMs);
                return true;
            }
            return false;
        }
    }
}
