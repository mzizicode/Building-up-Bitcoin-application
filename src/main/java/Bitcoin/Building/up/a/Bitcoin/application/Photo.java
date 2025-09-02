package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "photos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Full S3 URL to the uploaded object */
    @Column(nullable = false, length = 500)
    private String s3Url;

    /** Original file name (sanitized) */
    @Column(name = "file_name", length = 255)
    private String fileName;

    /** Optional description/caption */
    @Column(length = 500)
    private String description;

    /** Optional image dimensions */
    private Integer width;
    private Integer height;

    /** File size in bytes */
    @Column(nullable = false)
    private Long size;

    /** Status of this photo in the lottery flow */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private PhotoStatus status = PhotoStatus.IN_DRAW;

    /** Upload timestamp */
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime uploadDate = LocalDateTime.now();

    /** Coins awarded for this photo (used for reversal on delete) */
    @Column(name = "coins_earned", nullable = false)
    @Builder.Default
    private Integer coinsEarned = 0;

    /** Lottery flags */
    @Column(name = "is_winner")
    @Builder.Default
    private Boolean isWinner = false;

    @Column(name = "lottery_date")
    private LocalDate lotteryDate;

    /** Owner of the photo */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
