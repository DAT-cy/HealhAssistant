package health_assistant.module.users.entity;

import health_assistant.config.app.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "tbl_users", uniqueConstraints =
        @UniqueConstraint(name = "uk_tbl_users_email", columnNames = "email"))
public class User extends BaseEntity implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "username", nullable = false, unique = true, length = 254)
    private String username;

    @Column(name = "password")
    private String password;

    @Column(name = "email", length = 254)
    private String email;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(name = "enable")
    private Boolean enable;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = true;

    @Column(name = "auth_version", nullable = false)
    private int authVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(enable) && emailVerified;
    }
}
