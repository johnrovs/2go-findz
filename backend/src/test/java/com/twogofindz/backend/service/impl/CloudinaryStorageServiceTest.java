package com.twogofindz.backend.service.impl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CloudinaryStorageServiceTest {

    private final CloudinaryStorageService service = new CloudinaryStorageService("cloudinary://key:secret@demo");

    @Test
    void extractPublicId_returnsFolderPrefixedId_forAFolderedUpload() {
        String url = "https://res.cloudinary.com/demo/image/upload/v1699999999/2go-findz/abc123.jpg";
        assertThat(service.extractPublicId(url)).isEqualTo("2go-findz/abc123");
    }

    @Test
    void extractPublicId_returnsPlainId_whenThereIsNoFolder() {
        String url = "https://res.cloudinary.com/demo/image/upload/v1699999999/abc123.png";
        assertThat(service.extractPublicId(url)).isEqualTo("abc123");
    }

    @Test
    void extractPublicId_returnsNull_forANonCloudinaryUrl() {
        assertThat(service.extractPublicId("img_20260726_120000_001.jpg")).isNull();
    }
}
