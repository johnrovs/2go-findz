package com.twogofindz.backend.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * Server-side sanitizer for rich-text fields (Buying Guide introduction, "why we recommend it",
 * advice sections, FAQ answers). Deliberately excludes iframe/embed support — arbitrary iframe
 * {@code src} is an open XSS surface, so embeds are out of scope for this feature (links to
 * external video are still fine, just not inline embeds).
 */
public final class HtmlSanitizer {

    private static final Safelist ALLOWLIST = Safelist.relaxed()
            .addTags("u")
            .removeTags("iframe", "video", "audio", "embed", "object")
            .addAttributes("img", "alt")
            .addProtocols("a", "href", "http", "https")
            // relaxed() restricts img src to http/https by default; jsoup rejects an empty
            // string as a protocol (addProtocols validates non-empty), so the only way to permit
            // relative paths ("/uploads/...", how this app serves locally-hosted images) is to
            // remove the protocol restriction entirely — an empty protocol set is treated by
            // jsoup as "no restriction" rather than "block everything".
            .removeProtocols("img", "src", "http", "https");

    private HtmlSanitizer() {
    }

    public static String sanitize(String rawHtml) {
        if (rawHtml == null) {
            return "";
        }
        return Jsoup.clean(rawHtml, ALLOWLIST);
    }
}
