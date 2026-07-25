package licaza.etiya.core.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Exercise {

  private String exerciseCatalogItemId;

  @NotBlank(message = "Exercise name cannot be blank")
  private String name;

  @NotEmpty(message = "An exercise must have at least one set")
  @Valid
  private List<GymSet> sets;
}
