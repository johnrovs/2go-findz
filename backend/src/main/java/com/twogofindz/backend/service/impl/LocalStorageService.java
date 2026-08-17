package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.exception.InvalidFileException;
import com.twogofindz.backend.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Profile("!prod")
public class LocalStorageService implements StorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    private static final AtomicLong SEQUENCE = new AtomicLong(0);

    private final Path uploadDirectory;

    public LocalStorageService(@Value("${app.upload.directory}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory);
        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to initialize upload directory: " + uploadDirectory, e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Uploaded file must not be empty.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("Uploaded file exceeds the 5MB size limit.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new InvalidFileException("Only JPG, PNG, and WebP images are allowed.");
        }

        String extension = extensionFor(contentType);
        String filename = "img_" + LocalDateTime.now().format(TIMESTAMP_FORMAT)
                + "_" + String.format("%03d", SEQUENCE.incrementAndGet() % 1000) + "." + extension;

        try {
            Path target = uploadDirectory.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file.", e);
        }

        return filename;
    }

    @Override
    public void delete(String filename) {
        if (filename == null || filename.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(uploadDirectory.resolve(filename));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete stored file: " + filename, e);
        }
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> throw new InvalidFileException("Unsupported content type: " + contentType);
        };
    }
}
