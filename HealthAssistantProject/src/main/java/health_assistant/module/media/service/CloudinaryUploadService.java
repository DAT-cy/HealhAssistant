package health_assistant.module.media.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Iterator;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryUploadService {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 20_000_000L;
    private static final Set<String> ACCEPTED_TYPES = Set.of("image/jpeg", "image/png");

    private final ObjectProvider<Cloudinary> cloudinaryProvider;

    public UploadedAvatar uploadAvatar(Long userId, MultipartFile file) {
        validateImage(file);
        Cloudinary cloudinary = cloudinaryProvider.getIfAvailable();
        if (cloudinary == null) {
            throw new CloudinaryUploadException("Cloudinary chưa được cấu hình ở backend.");
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", "image",
                    "folder", "health-assistant/avatars",
                    "public_id", "user-" + userId + "-avatar",
                    "overwrite", true,
                    "invalidate", true,
                    "allowed_formats", new String[] { "jpg", "jpeg", "png" }));
            String secureUrl = String.valueOf(result.get("secure_url"));
            String publicId = String.valueOf(result.get("public_id"));
            if (secureUrl.isBlank() || "null".equals(secureUrl) || publicId.isBlank() || "null".equals(publicId)) {
                throw new CloudinaryUploadException("Cloudinary không trả về thông tin ảnh hợp lệ.");
            }
            return new UploadedAvatar(secureUrl, publicId);
        } catch (CloudinaryUploadException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Cloudinary upload failed ({})", exception.getClass().getSimpleName());
            throw new CloudinaryUploadException("Không thể tải ảnh lên Cloudinary.");
        }
    }

    public UploadedMealPhoto uploadMealPhoto(Long userId, MultipartFile file) {
        validateImage(file);
        Cloudinary cloudinary = cloudinaryProvider.getIfAvailable();
        if (cloudinary == null) throw new CloudinaryUploadException("Cloudinary chưa được cấu hình ở backend.");
        String folder = "health-assistant/meal-photos/user-" + userId;
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", "image",
                    "public_id", folder + "/" + UUID.randomUUID(),
                    "allowed_formats", new String[] { "jpg", "jpeg", "png" }));
            String secureUrl = String.valueOf(result.get("secure_url"));
            String publicId = String.valueOf(result.get("public_id"));
            if (secureUrl.isBlank() || "null".equals(secureUrl) || !publicId.startsWith(folder + "/")) {
                throw new CloudinaryUploadException("Cloudinary không trả về ảnh món ăn hợp lệ.");
            }
            return new UploadedMealPhoto(secureUrl, publicId);
        } catch (CloudinaryUploadException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Cloudinary meal photo upload failed ({})", exception.getClass().getSimpleName());
            throw new CloudinaryUploadException("Không thể lưu ảnh món ăn.");
        }
    }

    public void deleteMealPhoto(Long userId, String publicId) {
        String expectedFolder = "health-assistant/meal-photos/user-" + userId + "/";
        if (publicId == null || !publicId.startsWith(expectedFolder)) {
            throw new IllegalArgumentException("Ảnh không thuộc tài khoản hiện tại.");
        }
        Cloudinary cloudinary = cloudinaryProvider.getIfAvailable();
        if (cloudinary == null) throw new CloudinaryUploadException("Cloudinary chưa được cấu hình ở backend.");
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image", "invalidate", true));
        } catch (Exception exception) {
            log.warn("Cloudinary meal photo delete failed ({})", exception.getClass().getSimpleName());
            throw new CloudinaryUploadException("Không thể xóa ảnh món ăn.");
        }
    }

    public void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Chưa chọn ảnh.");
        if (file.getSize() > MAX_BYTES) throw new IllegalArgumentException("Ảnh vượt quá giới hạn 5 MB.");
        String contentType = file.getContentType();
        if (contentType == null || !ACCEPTED_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Chỉ chấp nhận ảnh JPEG hoặc PNG.");
        }
        try (InputStream stream = file.getInputStream();
             ImageInputStream input = ImageIO.createImageInputStream(stream)) {
            if (input == null) throw new IllegalArgumentException("Tệp tải lên không phải ảnh hợp lệ.");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new IllegalArgumentException("Tệp tải lên không phải ảnh JPEG/PNG hợp lệ.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                long pixels = (long) width * height;
                if (width < 1 || height < 1 || pixels > MAX_PIXELS) {
                    throw new IllegalArgumentException("Kích thước ảnh không hợp lệ.");
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("Không đọc được ảnh đã chọn.", exception);
        }
    }

    private void validateImage(MultipartFile file) { validateImageFile(file); }

    public record UploadedAvatar(String secureUrl, String publicId) {}
    public record UploadedMealPhoto(String secureUrl, String publicId) {}
}
