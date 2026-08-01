package licaza.etiya.core.exception;

import lombok.Getter;

@Getter
public abstract class BusinessException extends RuntimeException {
  private final String code;
  private final int statusCode;

  public BusinessException(String code, String message, int statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
