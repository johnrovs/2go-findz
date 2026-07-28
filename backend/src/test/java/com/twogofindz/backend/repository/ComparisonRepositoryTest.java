package com.twogofindz.backend.repository;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.Comparison;
import com.twogofindz.backend.entity.ComparisonFaq;
import com.twogofindz.backend.entity.ComparisonProduct;
import com.twogofindz.backend.entity.ComparisonSection;
import com.twogofindz.backend.entity.ComparisonSpecRow;
import com.twogofindz.backend.entity.ComparisonSpecValue;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.SpecTier;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ComparisonRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ComparisonRepository comparisonRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void savesAndReloadsFullNestedComparison_thenCascadeDeletesAllChildren() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Repo Test Category").commissionRate(new BigDecimal("5.00")).build());
        Product productA = productRepository.save(
                Product.builder().name("Repo Test Product A").description("desc").category(category)
                        .productPrice(new BigDecimal("19.99")).productLink("https://example.com/a")
                        .trending(false).bestSeller(false).active(true).build());
        Product productB = productRepository.save(
                Product.builder().name("Repo Test Product B").description("desc").category(category)
                        .productPrice(new BigDecimal("29.99")).productLink("https://example.com/b")
                        .trending(false).bestSeller(false).active(true).build());

        Comparison comparison = Comparison.builder()
                .title("Repo Test Comparison")
                .slug("repo-test-comparison")
                .description("A comparison used only for repository-level testing.")
                .category(category)
                .published(false)
                .build();

        List<ComparisonProduct> products = new ArrayList<>();
        products.add(ComparisonProduct.builder().comparison(comparison).product(productA)
                .recommendation("Great overall.").bestFor("Everyone").mainStrength("Speed").mainWeakness("Price")
                .pros("Fast\nReliable").cons("Expensive").build());
        products.add(ComparisonProduct.builder().comparison(comparison).product(productB)
                .recommendation("Great budget pick.").bestFor("Budget shoppers").mainStrength("Price").mainWeakness("Speed")
                .pros("Cheap").cons("Slower").build());
        comparison.setProducts(products);

        ComparisonSpecRow row = ComparisonSpecRow.builder().comparison(comparison)
                .groupLabel("Performance").rowLabel("Speed").build();
        List<ComparisonSpecValue> values = new ArrayList<>();
        values.add(ComparisonSpecValue.builder().specRow(row).product(productA).value("Fast").tier(SpecTier.BEST).build());
        values.add(ComparisonSpecValue.builder().specRow(row).product(productB).value("Moderate").tier(SpecTier.STANDARD).build());
        row.setValues(values);
        List<ComparisonSpecRow> specRows = new ArrayList<>();
        specRows.add(row);
        comparison.setSpecRows(specRows);

        List<ComparisonSection> sections = new ArrayList<>();
        sections.add(ComparisonSection.builder().comparison(comparison)
                .heading("Buying Tips").body("Consider your budget first.").build());
        comparison.setSections(sections);

        List<ComparisonFaq> faqs = new ArrayList<>();
        faqs.add(ComparisonFaq.builder().comparison(comparison)
                .question("Which is better?").answer("It depends on your budget.").build());
        comparison.setFaqs(faqs);

        Comparison saved = comparisonRepository.save(comparison);
        entityManager.flush();
        entityManager.clear();

        Comparison reloaded = comparisonRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getProducts()).hasSize(2);
        assertThat(reloaded.getProducts().get(0).getProduct().getName()).isEqualTo("Repo Test Product A");
        assertThat(reloaded.getSpecRows()).hasSize(1);
        assertThat(reloaded.getSpecRows().get(0).getValues()).hasSize(2);
        assertThat(reloaded.getSections()).hasSize(1);
        assertThat(reloaded.getFaqs()).hasSize(1);

        Long id = reloaded.getId();
        comparisonRepository.delete(reloaded);
        entityManager.flush();
        entityManager.clear();

        assertThat(comparisonRepository.findById(id)).isEmpty();
        assertThat(countChildRows("ComparisonProduct", id)).isZero();
        assertThat(countChildRows("ComparisonSection", id)).isZero();
        assertThat(countChildRows("ComparisonFaq", id)).isZero();
        assertThat(countChildRows("ComparisonSpecRow", id)).isZero();
    }

    private Long countChildRows(String entityName, Long comparisonId) {
        return entityManager.createQuery(
                        "SELECT COUNT(e) FROM " + entityName + " e WHERE e.comparison.id = :id", Long.class)
                .setParameter("id", comparisonId)
                .getSingleResult();
    }
}
