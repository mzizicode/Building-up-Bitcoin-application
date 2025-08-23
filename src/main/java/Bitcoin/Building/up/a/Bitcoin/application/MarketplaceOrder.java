package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "marketplace_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MarketplaceOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", unique = true, nullable = false, length = 50)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", nullable = false)
    private MarketplaceItem item;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "service_fee", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal serviceFee = BigDecimal.ZERO;

    @Column(name = "escrow_amount", precision = 15, scale = 2)
    private BigDecimal escrowAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "shipping_address", columnDefinition = "TEXT")
    private String shippingAddress;

    // NEW SHIPPING FIELDS
    @Column(name = "tracking_number", length = 200)
    private String trackingNumber;

    @Column(name = "shipping_carrier", length = 100)
    private String shippingCarrier;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    // Keep the JSON field for additional tracking info if needed
    @Column(name = "tracking_info", columnDefinition = "JSON")
    private String trackingInfo;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MarketplaceReview> reviews = new ArrayList<>();

    public enum OrderStatus {
        PENDING,        // Order created, waiting for payment
        CONFIRMED,      // Payment confirmed, item reserved
        SHIPPED,        // Item shipped by seller
        DELIVERED,      // Item delivered to buyer
        COMPLETED,      // Transaction completed successfully
        CANCELLED,      // Order cancelled
        DISPUTED        // Order in dispute
    }

    public enum PaymentStatus {
        PENDING,        // Payment not yet processed
        PAID,           // Payment completed
        ESCROWED,       // Payment held in escrow
        RELEASED,       // Payment released to seller
        REFUNDED        // Payment refunded to buyer
    }

    // Helper methods
    public boolean canBeCancelled() {
        return status == OrderStatus.PENDING || status == OrderStatus.CONFIRMED;
    }

    public boolean canBeShipped() {
        return status == OrderStatus.CONFIRMED && paymentStatus == PaymentStatus.ESCROWED;
    }

    public boolean canBeCompleted() {
        return status == OrderStatus.DELIVERED || status == OrderStatus.SHIPPED;
    }

    @PrePersist
    protected void onCreate() {
        if (orderNumber == null) {
            orderNumber = generateOrderNumber();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private String generateOrderNumber() {
        return "ORD-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 1000);
    }
}