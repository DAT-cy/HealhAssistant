package health_assistant.module.workout.service;

import health_assistant.module.workout.dto.ExerciseCatalogResponse;
import health_assistant.module.workout.entity.ExerciseCatalog;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Lọc bài tập theo chống chỉ định bệnh lý của người dùng (dữ liệu do Admin/Bác sĩ khai báo trong thư viện). */
public final class ExerciseSafety {
    private ExerciseSafety() {}

    /** Mã bệnh trong hồ sơ (bỏ bệnh tự khai CUSTOM:..., vì không có trong danh mục để đối chiếu). */
    public static Set<String> diseaseCodes(String raw) {
        Set<String> codes = new LinkedHashSet<>();
        if (raw == null || raw.isBlank()) return codes;
        Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(code -> !code.isEmpty() && !code.toUpperCase(Locale.ROOT).startsWith("CUSTOM"))
                .map(code -> code.split(":")[0].trim().toUpperCase(Locale.ROOT))
                .filter(code -> !code.isEmpty())
                .forEach(codes::add);
        return codes;
    }

    /** Các mã bệnh của người dùng mà bài tập này chống chỉ định (rỗng = được tập). */
    public static List<String> blockedBy(ExerciseCatalog exercise, Set<String> userDiseaseCodes) {
        if (exercise == null || userDiseaseCodes.isEmpty()) return List.of();
        return ExerciseCatalogResponse.splitCodes(exercise.getContraindicatedDiseaseCodes()).stream()
                .map(code -> code.toUpperCase(Locale.ROOT))
                .filter(userDiseaseCodes::contains)
                .toList();
    }
}
