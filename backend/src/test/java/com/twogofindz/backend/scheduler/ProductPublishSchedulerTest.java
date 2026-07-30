package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class ProductPublishSchedulerTest extends AbstractIntegrationTest {

    @Autowired
    private ProductPublishScheduler scheduler;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Test
    @Transactional
    void publishScheduledProducts_activatesDueProduct_andClearsScheduledDate() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Due Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        Product due = productRepository.save(Product.builder()
                .name("Due Product").description("Should be published by the scheduler.").category(category)
                .productPrice(new BigDecimal("10.00")).productLink("https://amazon.com/dp/due")
                .trending(false).bestSeller(false).active(false)
                .scheduledPublishAt(LocalDateTime.now().minusMinutes(1))
                .build());

        scheduler.publishScheduledProducts();

        Product refreshed = productRepository.findById(due.getId()).orElseThrow();
        assertThat(refreshed.isActive()).isTrue();
        assertThat(refreshed.getScheduledPublishAt()).isNull();
    }

    @Test
    @Transactional
    void publishScheduledProducts_leavesNotYetDueProductUntouched() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Not Due Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        Product notDue = productRepository.save(Product.builder()
                .name("Not Due Product").description("Should stay inactive.").category(category)
                .productPrice(new BigDecimal("10.00")).productLink("https://amazon.com/dp/notdue")
                .trending(false).bestSeller(false).active(false)
                .scheduledPublishAt(LocalDateTime.now().plusDays(1))
                .build());

        scheduler.publishScheduledProducts();

        Product refreshed = productRepository.findById(notDue.getId()).orElseThrow();
        assertThat(refreshed.isActive()).isFalse();
        assertThat(refreshed.getScheduledPublishAt()).isNotNull();
    }
}
