package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.RecommendationType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class BuyingGuideSectionRequestValidationTest {

    private static final Validator VALIDATOR;

    static {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        VALIDATOR = factory.getValidator();
    }

    @Test
    void quickRecommendationRequest_rejectsBlankBadgeName() {
        BuyingGuideQuickRecommendationRequest request = new BuyingGuideQuickRecommendationRequest(1L, "");
        Set<ConstraintViolation<BuyingGuideQuickRecommendationRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void faqRequest_rejectsBlankQuestionAndAnswer() {
        BuyingGuideFaqRequest request = new BuyingGuideFaqRequest("", "");
        Set<ConstraintViolation<BuyingGuideFaqRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).hasSize(2);
    }

    @Test
    void recommendationSectionRequest_rejectsEmptyProsList() {
        BuyingGuideRecommendationSectionRequest request = new BuyingGuideRecommendationSectionRequest(
                1L, RecommendationType.TOP_PICK, "Our Top Pick", "Great product.",
                List.of(),
                List.of(new BuyingGuideRecommendationItemRequest("Con one")),
                List.of(new BuyingGuideRecommendationItemRequest("Best for one")));
        Set<ConstraintViolation<BuyingGuideRecommendationSectionRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void recommendationItemRequest_rejectsBlankContent() {
        BuyingGuideRecommendationItemRequest request = new BuyingGuideRecommendationItemRequest("");
        Set<ConstraintViolation<BuyingGuideRecommendationItemRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void comparisonSpecRequest_rejectsEmptyValuesList() {
        BuyingGuideComparisonSpecRequest request = new BuyingGuideComparisonSpecRequest("Battery Life", List.of());
        Set<ConstraintViolation<BuyingGuideComparisonSpecRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void tocEntryRequest_rejectsTitleOverMaxLength() {
        String tooLongTitle = "a".repeat(151);
        BuyingGuideTocEntryRequest request = new BuyingGuideTocEntryRequest(null, tooLongTitle, "Some content.", true);
        Set<ConstraintViolation<BuyingGuideTocEntryRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }
}
