package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "buying_guides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 220, unique = true)
    private String slug;

    @Column(nullable = false, length = 500)
    private String excerpt;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String introduction;

    @Column(name = "cover_image_filename")
    private String coverImageFilename;

    @ManyToOne(optional = true)
    @JoinColumn(name = "category_id")
    private ProductCategory category;

    @Column(name = "seo_title", length = 70)
    private String seoTitle;

    @Column(name = "seo_description", length = 200)
    private String seoDescription;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "scheduled_publish_at")
    private LocalDateTime scheduledPublishAt;

    @ManyToMany
    @JoinTable(
            name = "buying_guide_products",
            joinColumns = @JoinColumn(name = "buying_guide_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    @OrderColumn(name = "display_order")
    private List<Product> recommendedProducts;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
