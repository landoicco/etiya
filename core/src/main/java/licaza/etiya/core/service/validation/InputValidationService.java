package licaza.etiya.core.service.validation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.Set;
import java.util.stream.Collectors;
import licaza.etiya.core.exception.InputValidationException;
import org.springframework.stereotype.Service;

@Service
public class InputValidationService {

  private final Validator validator;

  public InputValidationService(Validator validator) {
    this.validator = validator;
  }

  public <T> void validate(T input) {
    Set<ConstraintViolation<T>> violations = validator.validate(input);
    if (!violations.isEmpty()) {
      String errorMsg =
          violations.stream()
              .map(ConstraintViolation::getMessage)
              .collect(Collectors.joining(", "));
      throw new InputValidationException("❌ Validation Error: " + errorMsg);
    }
  }
}
