package com.twogofindz.backend.repository.spec;

import com.twogofindz.backend.entity.Product;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> search(String term) {
        return (root, query, cb) -> {
            if (term == null || term.isBlank()) {
                return cb.conjunction();
            }
            String like = "%" + term.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("description")), like),
                    cb.like(cb.lower(root.get("category").get("productCategoryName")), like),
                    cb.like(cb.lower(root.get("sku")), like)
            );
        };
    }

    public static Specification<Product> hasCategoryId(Long categoryId) {
        return (root, query, cb) ->
                categoryId == null ? cb.conjunction() : cb.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Product> hasBrand(String brand) {
        return (root, query, cb) ->
                (brand == null || brand.isBlank())
                        ? cb.conjunction()
                        : cb.equal(cb.lower(root.get("brand")), brand.toLowerCase());
    }

    public static Specification<Product> isTrending(Boolean trending) {
        return (root, query, cb) ->
                trending == null ? cb.conjunction() : cb.equal(root.get("trending"), trending);
    }

    public static Specification<Product> isBestSeller(Boolean bestSeller) {
        return (root, query, cb) ->
                bestSeller == null ? cb.conjunction() : cb.equal(root.get("bestSeller"), bestSeller);
    }

    public static Specification<Product> isActive(Boolean active) {
        return (root, query, cb) ->
                active == null ? cb.conjunction() : cb.equal(root.get("active"), active);
    }

    public static Specification<Product> priceBetween(BigDecimal min, BigDecimal max) {
        return (root, query, cb) -> {
            if (min == null && max == null) {
                return cb.conjunction();
            }
            if (min != null && max != null) {
                return cb.between(root.get("productPrice"), min, max);
            }
            return min != null
                    ? cb.greaterThanOrEqualTo(root.get("productPrice"), min)
                    : cb.lessThanOrEqualTo(root.get("productPrice"), max);
        };
    }
}
