package licaza.etiya.core.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Gym {
  private String id;

  @NotBlank(message = "Gym name cannot be blank")
  @Size(min = 3, max = 50, message = "Gym name must be between 3 and 50 characters")
  private String name;

  @NotBlank(message = "Gym location cannot be blank")
  private String location;
}
