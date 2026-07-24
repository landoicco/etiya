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
public class Workout {
  private String id;

  @NotBlank(message = "The workout date and time cannot be blank")
  private String dateTime;

  private String gymId;
  private String gymName;

  @NotEmpty(message = "A workout must have at least one exercise")
  @Valid
  private List<Exercise> exercises;
}
