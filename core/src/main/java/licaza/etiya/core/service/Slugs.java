package licaza.etiya.core.service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

// Catalog IDs and search prefixes must be built the same way, or prefix search stops matching
public final class Slugs {

  private Slugs() {}

  // "Gold's Gym  Querétaro" -> "golds-gym-queretaro". Null or blank parts are skipped
  public static String of(String... parts) {
    String text =
        Arrays.stream(parts)
            .filter(Objects::nonNull)
            .filter(part -> !part.isBlank())
            .collect(Collectors.joining(" "));

    // Splitting accented letters into base letter + mark lets the marks be dropped: é -> e, ñ -> n
    String withoutAccents =
        Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");

    return withoutAccents
        .toLowerCase(Locale.ROOT)
        // Apostrophes join words (gold's -> golds); any other symbol or space separates them
        .replaceAll("['’]", "")
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-|-$", "");
  }
}
