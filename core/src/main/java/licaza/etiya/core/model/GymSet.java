package licaza.etiya.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
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

  @NotNull(message = "Weight unit (KG, LB or NONE) is required")
  private WeightUnit unit;

  // "0 kg" and "no weight" are different sets, so a weight with NONE is a client bug worth
  // rejecting rather than silently dropping. Checked by the validator, never serialized
  @JsonIgnore
  @AssertTrue(message = "Weight must be 0 when the unit is NONE")
  boolean isWeightAllowedByUnit() {
    return unit != WeightUnit.NONE || weight == 0;
  }
}
