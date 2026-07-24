package licaza.etiya.core.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GymSet {
  @Min(value = 1, message = "Repetitions count must be at least 1")
  private int count;

  @Min(value = 0, message = "Weight cannot be negative")
  private double weight;

  @NotNull(message = "Weight unit (KG/LB) is required")
  private WeightUnit unit;
}
