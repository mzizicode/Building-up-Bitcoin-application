package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "photos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user"})
@EqualsAndHashCode(exclude = {"user"})
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "s3url", nullable = false, length = 500)
    private String s3Url;

    @Column(name = "upload_date")
    @Builder.Default
    private LocalDateTime uploadDate = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private String location;

    @Column
    private Long size;

    @Column
    private Integer width;

    @Column
    private Integer height;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private PhotoStatus status;

    @Column(name = "s3_key", length = 500)
    private String s3Key;

    @Column(name = "is_winner")
    @Builder.Default
    private Boolean isWinner = false;

    @Column(name = "lottery_date")
    private LocalDate lotteryDate;

    public enum PhotoStatus {
        SUBMITTED,
        APPROVED,
        REJECTED,
        WINNER
    }

    @PrePersist
    protected void onCreate() {
        if (uploadDate == null) {
            uploadDate = LocalDateTime.now();
        }
        if (isWinner == null) {
            isWinner = false;
        }
    }
}