package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record HeroBannerRequest(
        @NotBlank(message = "Slide image is required.")
        @Size(max = 255, message = "Image filename must be at most 255 characters.")
        String imageFilename,

        @NotBlank(message = "Image alt text is required.")
        @Size(max = 255, message = "Image alt text must be at most 255 characters.")
        String imageAlt,

        String badge,

        @NotBlank(message = "Headline is required.")
        @Size(max = 200, message = "Headline must be at most 200 characters.")
        String headline,

        String description,

        @NotBlank(message = "Button text is required.")
        @Size(max = 100, message = "Button text must be at most 100 characters.")
        String buttonText,

        @NotBlank(message = "Button link is required.")
        @Pattern(regexp = "^/.*", message = "Button link must be an internal path starting with /.")
        @Size(max = 255, message = "Button link must be at most 255 characters.")
        String buttonLink,

        @NotNull(message = "Display order is required.")
        Integer displayOrder,

        @NotNull(message = "Active flag is required.")
        Boolean active
) {
}
