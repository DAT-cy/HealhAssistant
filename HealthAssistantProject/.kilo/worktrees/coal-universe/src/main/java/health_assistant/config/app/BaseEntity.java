package health_assistant.config.app;

    import health_assistant.module.users.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Date;

@MappedSuperclass
public class BaseEntity {

    @Column(name = "created_id", updatable = false)
    @NotNull
    private String createdId;
    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private Date createdAt;
    @Column(name = "updated_id")
    @NotNull
    private String updatedId;
    @UpdateTimestamp
    @Column(name = "updated_at")
    private Date updatedAt;
    @PrePersist
    public void prePersist(){
        try{
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = ((User) userDetails).getUsername();
            this.createdId = userId;
            this.updatedId = userId;
        }catch (Exception e){
            String userId = "Anonymous";
            this.createdId = userId;
            this.updatedId = userId;
        }
    }
    @PreUpdate
    public void preUpdate(){
        try{
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String userId = ((User) userDetails).getUsername();
            this.updatedId = userId;
            if(this.createdId == null){
                this.createdId = userId;
            }
        }catch (Exception e){
            String userId = "Unknown User";
            this.updatedId = userId;
            if(this.createdId == null){
                this.createdId = userId;
            }
        }
    }

    public @NotNull String getCreatedId() {
        return createdId;
    }

    public void setCreatedId(@NotNull String createdId) {
        this.createdId = createdId;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public @NotNull String getUpdatedId() {
        return updatedId;
    }

    public void setUpdatedId(@NotNull String updatedId) {
        this.updatedId = updatedId;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
}
