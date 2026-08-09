package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettings {

    @Id
    private Long id;

    @Column(name = "logo_image_filename")
    private String logoImageFilename;

    @Column(name = "hero_image_filename")
    private String heroImageFilename;

    @Column(name = "placeholder_image_filename")
    private String placeholderImageFilename;

    @Column(name = "tiktok_url", length = 500)
    private String tiktokUrl;

    @Column(name = "pinterest_url", length = 500)
    private String pinterestUrl;

    @Column(name = "instagram_url", length = 500)
    private String instagramUrl;

    @Column(name = "youtube_url", length = 500)
    private String youtubeUrl;

    @Column(name = "facebook_url", length = 500)
    private String facebookUrl;

    @Column(name = "shop_bio", columnDefinition = "TEXT")
    private String shopBio;

    @Column(name = "hero_headline")
    private String heroHeadline;

    @Column(name = "hero_description", columnDefinition = "TEXT")
    private String heroDescription;

    @Column(name = "affiliate_disclosure", columnDefinition = "TEXT")
    private String affiliateDisclosure;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
