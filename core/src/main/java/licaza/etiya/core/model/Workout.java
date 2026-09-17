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

  @NotBlank(message = "The user ID cannot be blank")
  private String userId;

  // ISO-8601 with a time zone on input, stored in UTC (yyyy-MM-ddTHH:mm:ssZ)
  @NotBlank(message = "The workout start time cannot be blank")
  private String startedAt;

  // Only completed workouts are stored, so the end time is required
  @NotBlank(message = "The workout end time cannot be blank")
  private String endedAt;

  private String gymId;
  private String gymName;

  @NotEmpty(message = "A workout must have at least one exercise")
  @Valid
  private List<Exercise> exercises;
}
