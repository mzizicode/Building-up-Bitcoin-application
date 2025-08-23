package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity representing items in the marketplace
 */
@Entity
@Table(name = "marketplace_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"seller", "category", "orders", "reviews", "favorites"})
@EqualsAndHashCode(exclude = {"seller", "category", "orders", "reviews", "favorites"})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MarketplaceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private MarketplaceCategory category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(name = "original_price", precision = 15, scale = 2)
    private BigDecimal originalPrice;

    @Column(length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ItemCondition condition = ItemCondition.NEW;

    @Column
    @Builder.Default
    private Integer quantity = 1;

    @Column(length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ItemStatus status = ItemStatus.ACTIVE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private List<String> images;

    @Column(columnDefinition = "text[]")
    private String[] tags;

    @Column(length = 200)
    private String location;

    @Column(name = "is_negotiable")
    @Builder.Default
    private Boolean isNegotiable = false;

    @Column(name = "views_count")
    @Builder.Default
    private Integer viewsCount = 0;

    @Column(name = "favorites_count")
    @Builder.Default
    private Integer favoritesCount = 0;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MarketplaceOrder> orders = new ArrayList<>();

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MarketplaceReview> reviews = new ArrayList<>();

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MarketplaceFavorite> favorites = new ArrayList<>();

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Item condition enum
     */
    public enum ItemCondition {
        NEW,
        USED_LIKE_NEW,
        USED_GOOD,
        USED_FAIR,
        FOR_PARTS
    }

    /**
     * Item status enum
     */
    public enum ItemStatus {
        ACTIVE,
        SOLD,
        DRAFT,
        SUSPENDED,
        EXPIRED,
        DELETED
    }

    /**
     * Increment view count
     */
    public void incrementViewCount() {
        this.viewsCount++;
    }

    /**
     * Check if item is available for purchase
     */
    public boolean isAvailable() {
        return this.status == ItemStatus.ACTIVE && this.quantity > 0;
    }

    /**
     * Calculate discount percentage if original price exists
     */
    public BigDecimal getDiscountPercentage() {
        if (originalPrice != null && originalPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal discount = originalPrice.subtract(price);
            return discount.divide(originalPrice, 2, BigDecimal.ROUND_HALF_UP)
                    .multiply(new BigDecimal(100));
        }
        return BigDecimal.ZERO;
    }
}