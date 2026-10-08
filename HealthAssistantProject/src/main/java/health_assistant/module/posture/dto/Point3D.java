package health_assistant.module.posture.dto;

/** A normalized pose landmark (x/y/z are normally in the range -1..1). */
public record Point3D(double x, double y, double z, double visibility) {
    public boolean isVisible(double minimumVisibility) {
        return visibility >= minimumVisibility;
    }
}
