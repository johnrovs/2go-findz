package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.WebsiteView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface WebsiteViewRepository extends JpaRepository<WebsiteView, Long> {

    long countByViewedAtBetween(LocalDateTime from, LocalDateTime to);

    List<WebsiteView> findByViewedAtBetween(LocalDateTime from, LocalDateTime to);
}
