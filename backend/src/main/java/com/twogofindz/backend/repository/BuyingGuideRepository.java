package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.BuyingGuide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BuyingGuideRepository extends JpaRepository<BuyingGuide, Long> {
    List<BuyingGuide> findAllByOrderByCreatedAtDesc();
    List<BuyingGuide> findByActiveTrueOrderByCreatedAtDesc();
    Optional<BuyingGuide> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);
    List<BuyingGuide> findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime now);
}
