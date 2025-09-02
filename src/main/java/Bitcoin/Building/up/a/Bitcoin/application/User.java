package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;  // Changed from 'name' to 'fullName' to match usage

    @Column(name = "phone_number")
    private String phone;

    private String country;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;  // Changed from Boolean to boolean

    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "verification_token_expiry")
    private LocalDateTime verificationTokenExpiry;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;  // Changed from Boolean to boolean

    // NEW: Role field for admin functionality
    @Column(name = "role", length = 50)
    @Builder.Default
    private String role = "USER";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Photo> photos = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Notification> notifications = new ArrayList<>();

    // Custom method for backward compatibility
    public String getName() {
        return this.fullName;
    }

    public void setName(String name) {
        this.fullName = name;
    }

    // NEW: Role helper methods
    public boolean isAdmin() {
        return "ADMIN".equals(this.role);
    }

    public boolean isUser() {
        return "USER".equals(this.role) || this.role == null;
    }

    public void setAdminRole() {
        this.role = "ADMIN";
    }

    public void setUserRole() {
        this.role = "USER";
    }

    // No need for custom isEmailVerified() method anymore
    // Lombok's @Data will generate it automatically as isEmailVerified()

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (role == null) {
            role = "USER";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}