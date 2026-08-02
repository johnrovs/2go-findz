package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class BuyingGuidePublishScheduler {

    private final BuyingGuideRepository buyingGuideRepository;

    public BuyingGuidePublishScheduler(BuyingGuideRepository buyingGuideRepository) {
        this.buyingGuideRepository = buyingGuideRepository;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void publishScheduledGuides() {
        List<BuyingGuide> due = buyingGuideRepository
                .findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime.now());
        due.forEach(guide -> {
            guide.setActive(true);
            guide.setScheduledPublishAt(null);
        });
        buyingGuideRepository.saveAll(due);
    }
}
