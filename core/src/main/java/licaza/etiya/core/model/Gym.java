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

  // The chain or brand, e.g. "Smart Fit"
  @NotBlank(message = "Gym name cannot be blank")
  @Size(min = 3, max = 50, message = "Gym name must be between 3 and 50 characters")
  private String name;

  // Optional: independent gyms have no branches, e.g. "Valle Oriente"
  @Size(max = 50, message = "Gym branch must be at most 50 characters")
  private String branch;

  @NotBlank(message = "Gym city cannot be blank")
  @Size(max = 50, message = "Gym city must be at most 50 characters")
  private String city;
}
