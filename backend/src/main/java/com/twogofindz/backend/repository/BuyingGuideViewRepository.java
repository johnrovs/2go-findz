package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.BuyingGuideView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BuyingGuideViewRepository extends JpaRepository<BuyingGuideView, Long> {

    /**
     * View counts for a specific, small set of guide ids (the dashboard's 5 latest guides),
     * grouped in one query rather than one query per guide — avoids N+1. Guides with zero views
     * in range are simply absent from the result; the caller defaults them to 0. Mirrors
     * ProductClickRepository.countClicksByProductIdsBetween exactly.
     */
    @Query("""
            select bgv.buyingGuide.id as guideId, count(bgv) as viewCount
            from BuyingGuideView bgv
            where bgv.buyingGuide.id in :guideIds and bgv.viewedAt between :from and :to
            group by bgv.buyingGuide.id
            """)
    List<GuideIdViewCountProjection> countViewsByGuideIdsBetween(@Param("guideIds") List<Long> guideIds,
                                                                   @Param("from") LocalDateTime from,
                                                                   @Param("to") LocalDateTime to);

    interface GuideIdViewCountProjection {
        Long getGuideId();

        Long getViewCount();
    }
}
