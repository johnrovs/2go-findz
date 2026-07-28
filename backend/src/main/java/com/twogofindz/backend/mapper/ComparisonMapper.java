package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.ComparisonFaqResponse;
import com.twogofindz.backend.dto.response.ComparisonProductResponse;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSectionResponse;
import com.twogofindz.backend.dto.response.ComparisonSpecRowResponse;
import com.twogofindz.backend.dto.response.ComparisonSpecValueResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;
import com.twogofindz.backend.entity.Comparison;
import com.twogofindz.backend.entity.ComparisonFaq;
import com.twogofindz.backend.entity.ComparisonProduct;
import com.twogofindz.backend.entity.ComparisonSection;
import com.twogofindz.backend.entity.ComparisonSpecRow;
import com.twogofindz.backend.entity.ComparisonSpecValue;
import org.springframework.stereotype.Component;

@Component
public class ComparisonMapper {

    private final ProductMapper productMapper;

    public ComparisonMapper(ProductMapper productMapper) {
        this.productMapper = productMapper;
    }

    public ComparisonResponse toResponse(Comparison comparison) {
        return new ComparisonResponse(
                comparison.getId(),
                comparison.getTitle(),
                comparison.getSlug(),
                comparison.getDescription(),
                comparison.getCoverImageFilename(),
                comparison.getCategory().getId(),
                comparison.getCategory().getProductCategoryName(),
                comparison.getSeoTitle(),
                comparison.getSeoDescription(),
                comparison.getPublished(),
                comparison.getProducts().stream().map(this::toProductResponse).toList(),
                comparison.getSpecRows().stream().map(this::toSpecRowResponse).toList(),
                comparison.getSections().stream().map(this::toSectionResponse).toList(),
                comparison.getFaqs().stream().map(this::toFaqResponse).toList(),
                comparison.getRelatedComparisons().stream().map(this::toSummary).toList(),
                comparison.getRelatedProducts().stream().map(productMapper::toResponse).toList(),
                comparison.getCreatedAt(),
                comparison.getUpdatedAt()
        );
    }

    public ComparisonSummaryResponse toSummary(Comparison comparison) {
        return new ComparisonSummaryResponse(
                comparison.getId(),
                comparison.getTitle(),
                comparison.getSlug(),
                comparison.getDescription(),
                comparison.getCoverImageFilename(),
                comparison.getCategory().getId(),
                comparison.getCategory().getProductCategoryName(),
                comparison.getPublished(),
                comparison.getCreatedAt(),
                comparison.getUpdatedAt()
        );
    }

    ComparisonProductResponse toProductResponse(ComparisonProduct product) {
        return new ComparisonProductResponse(
                product.getId(),
                productMapper.toResponse(product.getProduct()),
                product.getBadge(),
                product.getRecommendation(),
                product.getBestFor(),
                product.getMainStrength(),
                product.getMainWeakness(),
                product.getPros(),
                product.getCons(),
                product.getEditorsScore()
        );
    }

    ComparisonSpecRowResponse toSpecRowResponse(ComparisonSpecRow row) {
        return new ComparisonSpecRowResponse(
                row.getId(),
                row.getGroupLabel(),
                row.getRowLabel(),
                row.getValues().stream().map(this::toSpecValueResponse).toList()
        );
    }

    private ComparisonSpecValueResponse toSpecValueResponse(ComparisonSpecValue value) {
        return new ComparisonSpecValueResponse(value.getProduct().getId(), value.getValue(), value.getTier());
    }

    ComparisonSectionResponse toSectionResponse(ComparisonSection section) {
        return new ComparisonSectionResponse(section.getId(), section.getHeading(), section.getBody());
    }

    ComparisonFaqResponse toFaqResponse(ComparisonFaq faq) {
        return new ComparisonFaqResponse(faq.getId(), faq.getQuestion(), faq.getAnswer());
    }
}
