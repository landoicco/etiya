package licaza.etiya.core.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class SlugsTest {

  @ParameterizedTest(name = "\"{0}\" -> \"{1}\"")
  @CsvSource(
      delimiter = '|',
      quoteCharacter = '"',
      textBlock =
          """
          "Querétaro"                | queretaro
          "Año Nuevo"                | ano-nuevo
          "Gold's Gym"               | golds-gym
          "Gold’s Gym"               | golds-gym
          "  Farmer's Walk (Básico)" | farmers-walk-basico
          "Smart   Fit -- Centro!"   | smart-fit-centro
          "5x5 Program"              | 5x5-program
          """)
  void normalizesText(String input, String expected) {
    assertThat(Slugs.of(input)).isEqualTo(expected);
  }

  @Test
  void joinsPartsAndSkipsMissingOnes() {
    assertThat(Slugs.of("Smart Fit", "Valle Oriente", "Monterrey"))
        .isEqualTo("smart-fit-valle-oriente-monterrey");
    assertThat(Slugs.of("Smart Fit", null, "Monterrey")).isEqualTo("smart-fit-monterrey");
    assertThat(Slugs.of("Smart Fit", "  ", "Monterrey")).isEqualTo("smart-fit-monterrey");
  }

  // GymService relies on this to reject names made only of symbols
  @Test
  void isEmptyWhenNothingIsLeft() {
    assertThat(Slugs.of("!!!")).isEmpty();
    assertThat(Slugs.of()).isEmpty();
  }

  // Search builds its prefix with the same function as the stored IDs, or it stops matching
  @Test
  void partialQueryIsPrefixOfTheFullId() {
    String id = Slugs.of("Barbell Bench Press");

    assertThat(id).startsWith(Slugs.of("Barbell Ben"));
    assertThat(id).startsWith(Slugs.of("  BARBELL bénch "));
  }

  // Only letters that decompose into a Latin base letter survive. Spanish is fully covered,
  // other alphabets are not; see "Still open" in docs/decisions.md
  @ParameterizedTest(name = "\"{0}\" -> \"{1}\"")
  @CsvSource(
      delimiter = '|',
      quoteCharacter = '"',
      textBlock =
          """
          "Straße"            | stra-e
          "Smart Fit Øresund" | smart-fit-resund
          "Жим лёжа"          | ""
          """)
  void knownLimitationsOutsideTheLatinAlphabet(String input, String expected) {
    assertThat(Slugs.of(input)).isEqualTo(expected);
  }
}
