package health_assistant.config.exception;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerMaskTest {
    @Test
    void masksApiKeyInUrl() {
        var cause = new RuntimeException("503 for POST https://api.shopaikey.com/v1beta/models/m:generateContent?key=sk-SECRET123&alt=json");
        String detail = GlobalExceptionHandler.rootCauseChain(new IllegalStateException("AI failed", cause));
        assertThat(detail).doesNotContain("sk-SECRET123").contains("?key=***&alt=json", "IllegalStateException: AI failed");
    }
}
