package licaza.etiya.core.exception;

import java.time.LocalDateTime;
import java.util.function.Function;
import java.util.function.Supplier;
import licaza.etiya.core.model.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;

@Slf4j
public class FunctionWrapper {

  public static <T, R> Function<Message<T>, Message<?>> safe(
      Function<Message<T>, Message<R>> function) {
    return input -> {
      try {
        // Execute function
        return (Message<?>) function.apply(input);
      } catch (Exception ex) {
        return handleException(ex);
      }
    };
  }

  public static <R> Supplier<Message<?>> safe(Supplier<Message<R>> supplier) {
    return () -> {
      try {
        // Execute function
        return (Message<?>) supplier.get();
      } catch (Exception ex) {
        return handleException(ex);
      }
    };
  }

  private static Message<?> handleException(Exception ex) {
    ErrorResponse errorBody;
    int httpStatus = 500;

    if (ex instanceof BusinessException busEx) {
      httpStatus = busEx.getStatusCode();
      errorBody =
          new ErrorResponse(
              LocalDateTime.now(), httpStatus, busEx.getCode(), busEx.getMessage(), "", null);
    } else if (ex instanceof IllegalArgumentException) {
      httpStatus = 400;
      errorBody =
          new ErrorResponse(
              LocalDateTime.now(), httpStatus, "BAD_REQUEST", ex.getMessage(), "", null);
    } else {
      log.error("❌ Unexpected error while running Lambda: ", ex);
      errorBody =
          new ErrorResponse(
              LocalDateTime.now(),
              httpStatus,
              "INTERNAL_SERVER_ERROR",
              "❌ Unexpected error on server.",
              "",
              null);
    }

    return MessageBuilder.withPayload(errorBody)
        .setHeader("statusCode", httpStatus)
        .setHeader("Content-Type", "application/json")
        .build();
  }
}
