package org.example;

import java.net.URI;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class HtmlUtils {

    private static final Pattern HREF_PATTERN = Pattern.compile("href\\s*=\\s*([\"'])(.*?)\\1", Pattern.CASE_INSENSITIVE);
    private static final Pattern SRC_PATTERN  = Pattern.compile("src\\s*=\\s*([\"'])(.*?)\\1", Pattern.CASE_INSENSITIVE);
    private static final Pattern CSS_URL_PATTERN = Pattern.compile("url\\((['\"]?)(.*?)\\1\\)", Pattern.CASE_INSENSITIVE);

    public static Set<URI> extractLinks(String html, URI base) {
        Set<URI> out = new LinkedHashSet<>();
        addMatches(out, html, base, HREF_PATTERN, 2);
        addMatches(out, html, base, SRC_PATTERN, 2);
        addMatches(out, html, base, CSS_URL_PATTERN, 2);
        return out;
    }

    private static void addMatches(Set<URI> out, String html, URI base, Pattern p, int groupIdx) {
        Matcher m = p.matcher(html);
        while (m.find()) {
            String link = m.group(groupIdx);
            if (link == null) continue;
            link = link.trim();
            if (link.isEmpty()) continue;

            if (isSkippable(link)) continue;

            try {
                URI abs = base.resolve(link);
                abs = normalize(abs);
                out.add(abs);
            } catch (Exception ignored) {}
        }
    }

    public static boolean isSkippable(String link) {
        String l = link.toLowerCase();
        return l.startsWith("javascript:") || l.startsWith("mailto:") || l.startsWith("tel:") || l.startsWith("#") || l.startsWith("data:");
    }

    public static URI normalize(URI uri) {
        try {
            // quita fragment
            return new URI(
                    uri.getScheme(),
                    uri.getUserInfo(),
                    uri.getHost() == null ? null : uri.getHost().toLowerCase(),
                    uri.getPort(),
                    (uri.getPath() == null || uri.getPath().isEmpty()) ? "/" : uri.getPath(),
                    uri.getQuery(),
                    null
            );
        } catch (Exception e) {
            return uri;
        }
    }

    public static String rewriteLinksToLocal(
            String html,
            URI pageUrl,
            Path pageLocalFile,
            Path outDir,
            String baseHostNoWww,
            boolean sameHostOnly
    ) {
        html = rewriteAttr(html, pageUrl, pageLocalFile, outDir, baseHostNoWww, sameHostOnly, HREF_PATTERN, "href");
        html = rewriteAttr(html, pageUrl, pageLocalFile, outDir, baseHostNoWww, sameHostOnly, SRC_PATTERN, "src");
        // CSS url(...) se deja tal cual (puedes extenderlo si quieres)
        return html;
    }

    private static String rewriteAttr(
            String html,
            URI pageUrl,
            Path pageLocalFile,
            Path outDir,
            String baseHostNoWww,
            boolean sameHostOnly,
            Pattern pattern,
            String attrName
    ) {
        Matcher m = pattern.matcher(html);
        StringBuffer sb = new StringBuffer();

        while (m.find()) {
            String quote = m.group(1);
            String original = m.group(2);

            String replacement = original;
            if (!isSkippable(original)) {
                try {
                    URI abs = normalize(pageUrl.resolve(original));

                    String host = PathUtils.hostNoWww(abs.getHost());
                    if (sameHostOnly && !host.equalsIgnoreCase(baseHostNoWww)) {
                        replacement = original;
                    } else {
                        boolean targetHtml = PathUtils.guessHtmlLike(abs.getPath()).equals("html");
                        Path targetLocal = PathUtils.localPath(outDir, abs, targetHtml);
                        Path rel = PathUtils.relativeLink(pageLocalFile, targetLocal);
                        replacement = PathUtils.toBrowserPath(rel);
                    }
                } catch (Exception ignored) {}
            }

            String repl = attrName + "=" + quote + Matcher.quoteReplacement(replacement) + quote;
            m.appendReplacement(sb, repl);
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
