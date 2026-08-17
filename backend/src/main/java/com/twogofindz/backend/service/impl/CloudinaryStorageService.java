package com.twogofindz.backend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.twogofindz.backend.exception.InvalidFileException;
import com.twogofindz.backend.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Profile("prod")
public class CloudinaryStorageService implements StorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Pattern PUBLIC_ID_PATTERN = Pattern.compile("/v\\d+/(.+)\\.[a-zA-Z0-9]+$");

    private final Cloudinary cloudinary;

    public CloudinaryStorageService(@Value("${app.cloudinary.url}") String cloudinaryUrl) {
        this.cloudinary = new Cloudinary(cloudinaryUrl);
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

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("folder", "2go-findz", "resource_type", "image"));
            return (String) result.get("secure_url");
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to upload file to Cloudinary.", e);
        }
    }

    @Override
    public void delete(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return;
        }
        String publicId = extractPublicId(storedValue);
        if (publicId == null) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete file from Cloudinary: " + storedValue, e);
        }
    }

    String extractPublicId(String secureUrl) {
        Matcher matcher = PUBLIC_ID_PATTERN.matcher(secureUrl);
        return matcher.find() ? matcher.group(1) : null;
    }
}
