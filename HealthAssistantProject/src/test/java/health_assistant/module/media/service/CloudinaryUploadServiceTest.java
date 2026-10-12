package health_assistant.module.media.service;

import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class CloudinaryUploadServiceTest {
    private final ObjectProvider<Cloudinary> cloudinaryProvider = mock(ObjectProvider.class);
    private final CloudinaryUploadService service = new CloudinaryUploadService(cloudinaryProvider);

    @Test
    void rejectsEmptyFileBeforeCallingCloudinary() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> service.uploadAvatar(1L, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Chưa chọn ảnh");
    }

    @Test
    void rejectsUnsupportedMimeType() {
        MockMultipartFile file = new MockMultipartFile("file", "document.pdf", "application/pdf", new byte[] { 1, 2, 3 });

        assertThatThrownBy(() -> service.uploadAvatar(1L, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JPEG hoặc PNG");
    }
}
