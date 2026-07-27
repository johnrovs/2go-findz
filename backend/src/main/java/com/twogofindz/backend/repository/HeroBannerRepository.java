package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.HeroBanner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HeroBannerRepository extends JpaRepository<HeroBanner, Long> {
    List<HeroBanner> findAllByOrderByDisplayOrderAsc();
    List<HeroBanner> findByActiveTrueOrderByDisplayOrderAsc();
}
