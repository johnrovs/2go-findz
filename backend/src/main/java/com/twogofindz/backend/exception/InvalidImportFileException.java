package com.twogofindz.backend.exception;

public class InvalidImportFileException extends RuntimeException {
    public InvalidImportFileException(String message) {
        super(message);
    }
}
