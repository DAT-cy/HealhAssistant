package health_assistant.module.users.entity;

import lombok.Getter;

@Getter
public enum Role {
    ROLE_ADMIN("ADMIN"),
    ROLE_USER("USER"),
    ;
    private final String name;

    Role(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return name;
    }
} 