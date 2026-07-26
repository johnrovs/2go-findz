package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.WebsiteView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface WebsiteViewRepository extends JpaRepository<WebsiteView, Long> {

    long countByViewedAtBetween(LocalDateTime from, LocalDateTime to);

    /**
     * One row per calendar day with at least one view in range, grouped and counted at the
     * DB level (native SQL — MySQL-only project). website_views is the highest-cardinality
     * table in the system (one row per page view), so grouping in the JVM would mean pulling
     * the entire table into heap on every default (no from/to) dashboard request — avoided here.
     */
    @Query(value = """
            select date(viewed_at) as day, count(*) as cnt
            from website_views
            where viewed_at between :from and :to
            group by date(viewed_at)
            order by day
            """, nativeQuery = true)
    List<DailyCountProjection> countViewsByDay(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    interface DailyCountProjection {
        LocalDate getDay();

        Long getCnt();
    }
}
