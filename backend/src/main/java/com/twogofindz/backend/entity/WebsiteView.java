package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "website_views")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebsiteView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "anonymous_session_id", length = 64)
    private String anonymousSessionId;

    @Column(name = "viewed_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime viewedAt;
}
