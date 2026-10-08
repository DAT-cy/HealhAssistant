package health_assistant.config.response;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Schema(name = "DefaultRes")
@Data
@AllArgsConstructor
@Builder
public class DefaultRes<T> {
    private int statusCode;
    private String responseCode;
    private String responseMessage;
    private T data;

    public DefaultRes(final int statusCode, final String responseMessage) {
        this.statusCode = statusCode;
        this.responseMessage = responseMessage;
        this.data = null;
    }

    public DefaultRes(ErrorCode errorCode) {
        this.statusCode = errorCode.getStatus();
        this.responseCode = errorCode.getErrorCode();
        this.responseMessage = errorCode.getMessage();
        this.data = null;
    }

    public static <T> DefaultRes<T> res(final int statusCode, final String responseMessage) {
        return res(statusCode, responseMessage, null);
    }

    public static <T> DefaultRes<T> res(final int statusCode, final String responseMessage, final T t) {
        return DefaultRes.<T>builder()
                .data(t)
                .statusCode(statusCode)
                .responseMessage(responseMessage)
                .build();
    }
}
