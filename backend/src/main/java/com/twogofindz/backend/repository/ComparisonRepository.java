package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.Comparison;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComparisonRepository extends JpaRepository<Comparison, Long> {

    List<Comparison> findAllByOrderByCreatedAtDesc();

    List<Comparison> findByPublishedTrueOrderByCreatedAtDesc();

    Optional<Comparison> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);
}
