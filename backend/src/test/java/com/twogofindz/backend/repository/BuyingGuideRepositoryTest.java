package com.twogofindz.backend.repository;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideAdviceSection;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationItem;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import com.twogofindz.backend.entity.BuyingGuideSectionSetting;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.RecommendationItemType;
import com.twogofindz.backend.entity.RecommendationType;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BuyingGuideRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private BuyingGuideRepository buyingGuideRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void savingGuide_cascadesAllChildSections_andRoundTripsThem() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Repo Test Guide Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        Product product = productRepository.save(Product.builder()
                .name("Repo Test Product").description("For cascade test.").category(category)
                .productPrice(new BigDecimal("10.00")).productLink("https://amazon.com/dp/repotest")
                .trending(false).bestSeller(false).active(true).reviewCount(0)
                .build());

        BuyingGuide guide = BuyingGuide.builder()
                .title("Cascade Test Guide").slug("cascade-test-guide")
                .excerpt("Excerpt").introduction("Introduction")
                .category(category).active(true)
                .recommendedProducts(new ArrayList<>(List.of(product)))
                .build();

        BuyingGuideQuickRecommendation quickRec = BuyingGuideQuickRecommendation.builder()
                .buyingGuide(guide).product(product).badgeName("Best Overall").build();
        guide.setQuickRecommendations(new ArrayList<>(List.of(quickRec)));

        BuyingGuideComparisonSpec spec = BuyingGuideComparisonSpec.builder()
                .buyingGuide(guide).specificationName("Battery Life").build();
        BuyingGuideComparisonValue value = BuyingGuideComparisonValue.builder()
                .comparisonSpec(spec).product(product).specificationValue("40 Hrs").build();
        spec.setValues(new ArrayList<>(List.of(value)));
        guide.setComparisonSpecs(new ArrayList<>(List.of(spec)));

        BuyingGuideRecommendationSection section = BuyingGuideRecommendationSection.builder()
                .buyingGuide(guide).product(product).recommendationType(RecommendationType.TOP_PICK)
                .sectionLabel("Our Top Pick").whyRecommended("Great value.").build();
        BuyingGuideRecommendationItem pro = BuyingGuideRecommendationItem.builder()
                .recommendationSection(section).itemType(RecommendationItemType.PRO).content("Great sound").build();
        section.setItems(new ArrayList<>(List.of(pro)));
        guide.setRecommendationSections(new ArrayList<>(List.of(section)));

        BuyingGuideAdviceSection advice = BuyingGuideAdviceSection.builder()
                .buyingGuide(guide).title("What to Look For").content("Look for good battery life.").build();
        guide.setAdviceSections(new ArrayList<>(List.of(advice)));

        BuyingGuideFaq faq = BuyingGuideFaq.builder()
                .buyingGuide(guide).question("Is it worth it?").answer("Yes.").build();
        guide.setFaqs(new ArrayList<>(List.of(faq)));

        BuyingGuideSectionSetting setting = BuyingGuideSectionSetting.builder()
                .buyingGuide(guide).sectionKey(BuyingGuideSectionKey.FAQS).visible(true).build();
        guide.setSectionSettings(new ArrayList<>(List.of(setting)));

        BuyingGuide saved = buyingGuideRepository.saveAndFlush(guide);
        entityManager.clear();

        BuyingGuide reloaded = buyingGuideRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getQuickRecommendations()).hasSize(1);
        assertThat(reloaded.getComparisonSpecs()).hasSize(1);
        assertThat(reloaded.getComparisonSpecs().get(0).getValues()).hasSize(1);
        assertThat(reloaded.getRecommendationSections()).hasSize(1);
        assertThat(reloaded.getRecommendationSections().get(0).getItems()).hasSize(1);
        assertThat(reloaded.getAdviceSections()).hasSize(1);
        assertThat(reloaded.getFaqs()).hasSize(1);
        assertThat(reloaded.getSectionSettings()).hasSize(1);

        Long guideId = saved.getId();
        buyingGuideRepository.delete(reloaded);
        buyingGuideRepository.flush();

        Long remainingFaqs = entityManager.createQuery(
                        "select count(f) from BuyingGuideFaq f where f.buyingGuide.id = :guideId", Long.class)
                .setParameter("guideId", guideId)
                .getSingleResult();
        assertThat(remainingFaqs).isZero();

        Product stillExists = productRepository.findById(product.getId()).orElseThrow();
        assertThat(stillExists).isNotNull();
    }
}
