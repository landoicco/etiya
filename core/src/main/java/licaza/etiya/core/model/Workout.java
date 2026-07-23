package licaza.etiya.core.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Workout {
  private String id;
  private String dateTime;
  private List<Exercise> exercises;
}
