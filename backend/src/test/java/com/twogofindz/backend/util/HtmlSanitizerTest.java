package com.twogofindz.backend.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HtmlSanitizerTest {

    @Test
    void sanitize_keepsAllowlistedFormattingTags() {
        String input = "<p>Great <b>battery life</b> and <i>clear</i> <u>calls</u>.</p>"
                + "<ul><li>Point one</li><li>Point two</li></ul>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo(
                "<p>Great <b>battery life</b> and <i>clear</i> <u>calls</u>.</p>\n"
                        + "<ul>\n <li>Point one</li>\n <li>Point two</li>\n</ul>");
    }

    @Test
    void sanitize_keepsSafeLinksAndImages() {
        String input = "<a href=\"https://amazon.com/dp/example\">Buy it</a>"
                + "<img src=\"/uploads/photo.jpg\" alt=\"Product photo\">";
        String result = HtmlSanitizer.sanitize(input);
        assertThat(result).contains("href=\"https://amazon.com/dp/example\"");
        assertThat(result).contains("src=\"/uploads/photo.jpg\"");
        assertThat(result).contains("alt=\"Product photo\"");
    }

    @Test
    void sanitize_stripsScriptTags() {
        String input = "<p>Hello</p><script>alert('xss')</script>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<p>Hello</p>");
    }

    @Test
    void sanitize_stripsOnClickAttribute() {
        String input = "<p onclick=\"alert('xss')\">Click me</p>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<p>Click me</p>");
    }

    @Test
    void sanitize_stripsIframeEmbeds() {
        String input = "<p>Watch this</p><iframe src=\"https://youtube.com/embed/xyz\"></iframe>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<p>Watch this</p>");
    }

    @Test
    void sanitize_stripsJavascriptUrls() {
        String input = "<a href=\"javascript:alert(1)\">Click</a>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<a>Click</a>");
    }

    @Test
    void sanitize_returnsEmptyString_forNullInput() {
        assertThat(HtmlSanitizer.sanitize(null)).isEqualTo("");
    }
}
