package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BuyingGuidePublishSchedulerTest extends AbstractIntegrationTest {

    @Autowired
    private BuyingGuidePublishScheduler scheduler;

    @Autowired
    private BuyingGuideRepository buyingGuideRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Test
    @Transactional
    void publishScheduledGuides_activatesDueGuide_andClearsScheduledDate() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Due Guide Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        BuyingGuide due = buyingGuideRepository.save(BuyingGuide.builder()
                .title("Due Guide").slug("due-guide").excerpt("Excerpt").introduction("Introduction")
                .category(category).active(false)
                .scheduledPublishAt(LocalDateTime.now().minusMinutes(1))
                .recommendedProducts(List.of())
                .build());

        scheduler.publishScheduledGuides();

        BuyingGuide refreshed = buyingGuideRepository.findById(due.getId()).orElseThrow();
        assertThat(refreshed.getActive()).isTrue();
        assertThat(refreshed.getScheduledPublishAt()).isNull();
    }

    @Test
    @Transactional
    void publishScheduledGuides_leavesNotYetDueGuideUntouched() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Not Due Guide Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        BuyingGuide notDue = buyingGuideRepository.save(BuyingGuide.builder()
                .title("Not Due Guide").slug("not-due-guide").excerpt("Excerpt").introduction("Introduction")
                .category(category).active(false)
                .scheduledPublishAt(LocalDateTime.now().plusDays(1))
                .recommendedProducts(List.of())
                .build());

        scheduler.publishScheduledGuides();

        BuyingGuide refreshed = buyingGuideRepository.findById(notDue.getId()).orElseThrow();
        assertThat(refreshed.getActive()).isFalse();
        assertThat(refreshed.getScheduledPublishAt()).isNotNull();
    }
}
