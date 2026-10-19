package health_assistant.config.app;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
public class GoogleOAuthConfiguration {
    @Bean
    public GoogleIdTokenVerifier googleIdTokenVerifier(
            @Value("${google.oauth.client-ids:}") String clientIds) {
        List<String> audiences = Arrays.stream(clientIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
        return new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(audiences)
                .build();
    }
}
