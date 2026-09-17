package licaza.etiya.core.model;

import java.util.List;

// A slice of results; nextCursor is null when there is nothing left to fetch
public record Page<T>(List<T> items, String nextCursor) {

  public static <T> Page<T> of(List<T> items) {
    return new Page<>(items, null);
  }
}
