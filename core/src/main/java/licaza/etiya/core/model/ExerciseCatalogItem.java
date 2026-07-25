package licaza.etiya.core.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseCatalogItem {
  private String id;

  @NotBlank(message = "Exercise name cannot be blank")
  @Size(min = 2, max = 50, message = "Exercise name must be between 2 and 50 characters")
  private String name;

  @NotBlank(message = "Muscle group cannot be blank")
  private String muscleGroup;
}
