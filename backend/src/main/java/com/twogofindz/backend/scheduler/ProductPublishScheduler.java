package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.repository.ProductRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ProductPublishScheduler {

    private final ProductRepository productRepository;

    public ProductPublishScheduler(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void publishScheduledProducts() {
        List<Product> due = productRepository
                .findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime.now());
        due.forEach(product -> {
            product.setActive(true);
            product.setScheduledPublishAt(null);
        });
        productRepository.saveAll(due);
    }
}
