package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.BuyingGuide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BuyingGuideRepository extends JpaRepository<BuyingGuide, Long> {
    List<BuyingGuide> findAllByOrderByCreatedAtDesc();
    List<BuyingGuide> findByActiveTrueOrderByCreatedAtDesc();
}
