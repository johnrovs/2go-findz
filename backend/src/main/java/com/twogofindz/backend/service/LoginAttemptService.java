package com.twogofindz.backend.service;

public interface LoginAttemptService {

    /**
     * @return true if the given username is currently locked out due to repeated failed attempts.
     */
    boolean isLocked(String username);

    void recordFailure(String username);

    void recordSuccess(String username);
}
