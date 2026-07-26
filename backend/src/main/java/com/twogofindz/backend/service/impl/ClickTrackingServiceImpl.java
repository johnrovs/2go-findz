package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ClickRequest;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductClick;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.repository.ProductClickRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.ClickTrackingService;
import org.springframework.stereotype.Service;

@Service
public class ClickTrackingServiceImpl implements ClickTrackingService {

    private final ProductClickRepository productClickRepository;
    private final ProductRepository productRepository;

    public ClickTrackingServiceImpl(ProductClickRepository productClickRepository,
                                     ProductRepository productRepository) {
        this.productClickRepository = productClickRepository;
        this.productRepository = productRepository;
    }

    @Override
    public void recordClick(Long productId, ClickRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        ProductClick click = ProductClick.builder()
                .product(product)
                .anonymousSessionId(request == null ? null : request.sessionId())
                .build();
        productClickRepository.save(click);
    }
}
