package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

    private final UserRepository userRepository;
    private final MarketplaceItemRepository marketplaceItemRepository;
    private final WalletService walletService;
    private final MarketplaceOrderRepository orderRepository;
    private final NotificationService notificationService;

    /**
     * Create marketplace order
     */
    @PostMapping
    @Operation(summary = "Create order", description = "Create a new marketplace order")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        try {
            User currentUser = getCurrentUser();
            log.info("Creating order for user: {} - Item: {}", currentUser.getId(), request.getItemId());

            // Find the marketplace item
            MarketplaceItem item = marketplaceItemRepository.findById(request.getItemId())
                    .orElseThrow(() -> new RuntimeException("Item not found"));

            // Validate order - check if item is active and has quantity
            if (item.getStatus() != MarketplaceItem.ItemStatus.ACTIVE) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Item is no longer available"
                ));
            }

            if (item.getSeller().getId().equals(currentUser.getId())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "You cannot buy your own item"
                ));
            }

            int quantity = request.getQuantity() != null ? request.getQuantity() : 1;
            if (quantity > item.getQuantity()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Insufficient quantity available"
                ));
            }

            BigDecimal totalAmount = item.getPrice().multiply(BigDecimal.valueOf(quantity));

            // Check wallet balance using wallet service
            try {
                // Use escrow to hold the payment
                String orderRef = "ORDER-" + System.currentTimeMillis();
                walletService.holdInEscrow(
                        currentUser.getId(),
                        totalAmount,
                        orderRef,
                        "Purchase: " + item.getTitle()
                );

                // Create order entity
                MarketplaceOrder order = new MarketplaceOrder();
                order.setOrderNumber("ORD-" + System.currentTimeMillis());
                order.setBuyer(currentUser);
                order.setSeller(item.getSeller());
                order.setItem(item);
                order.setQuantity(quantity);
                order.setUnitPrice(item.getPrice());
                order.setTotalAmount(totalAmount);
                order.setEscrowAmount(totalAmount);
                order.setStatus(MarketplaceOrder.OrderStatus.CONFIRMED);
                order.setPaymentStatus(MarketplaceOrder.PaymentStatus.ESCROWED);
                order.setShippingAddress(request.getShippingAddress());
                order.setNotes(request.getNotes());
                order.setCreatedAt(LocalDateTime.now());
                order.setUpdatedAt(LocalDateTime.now());

                // Save order
                MarketplaceOrder savedOrder = orderRepository.save(order);

                // Update item quantity
                item.setQuantity(item.getQuantity() - quantity);
                if (item.getQuantity() <= 0) {
                    item.setStatus(MarketplaceItem.ItemStatus.SOLD);
                }
                marketplaceItemRepository.save(item);

                log.info("Order created successfully: {} for item {}", orderRef, item.getId());

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Order created successfully",
                        "orderId", savedOrder.getId(),
                        "orderNumber", savedOrder.getOrderNumber(),
                        "orderReference", orderRef,
                        "totalAmount", totalAmount,
                        "status", "CONFIRMED"
                ));

            } catch (RuntimeException e) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", e.getMessage()
                ));
            }

        } catch (Exception e) {
            log.error("Failed to create order", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to create order: " + e.getMessage()
            ));
        }
    }

    /**
     * Get user's orders
     */
    @GetMapping("/my-orders")
    @Operation(summary = "Get user orders", description = "Get orders for current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUserOrders() {
        try {
            User currentUser = getCurrentUser();

            // Get orders where user is buyer or seller
            List<MarketplaceOrder> buyerOrders = orderRepository.findByBuyerId(currentUser.getId());
            List<MarketplaceOrder> sellerOrders = orderRepository.findBySellerId(currentUser.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("buyerOrders", buyerOrders);
            response.put("sellerOrders", sellerOrders);
            response.put("totalBuyerOrders", buyerOrders.size());
            response.put("totalSellerOrders", sellerOrders.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get user orders", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve orders"
            ));
        }
    }

    /**
     * Get specific order details
     */
    @GetMapping("/{orderId}")
    @Operation(summary = "Get order details", description = "Get details of a specific order")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getOrderDetails(@PathVariable Long orderId) {
        try {
            User currentUser = getCurrentUser();

            MarketplaceOrder order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            // Check if user is authorized to view this order
            if (!order.getBuyer().getId().equals(currentUser.getId()) &&
                    !order.getSeller().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "You are not authorized to view this order"
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "order", order
            ));

        } catch (Exception e) {
            log.error("Failed to get order details", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve order details"
            ));
        }
    }

    /**
     * Cancel an order
     */
    @PostMapping("/{orderId}/cancel")
    @Operation(summary = "Cancel order", description = "Cancel an existing order")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> cancelOrder(@PathVariable Long orderId) {
        try {
            User currentUser = getCurrentUser();

            MarketplaceOrder order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            // Check if user is authorized to cancel this order
            if (!order.getBuyer().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Only the buyer can cancel this order"
                ));
            }

            // Check if order can be cancelled
            if (order.getStatus() != MarketplaceOrder.OrderStatus.CONFIRMED) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Order cannot be cancelled in current status: " + order.getStatus()
                ));
            }

            // Refund escrow funds back to buyer
            walletService.refundEscrow(
                    "ORDER-" + order.getId(),
                    "Order cancelled: " + order.getOrderNumber()
            );

            // Update order status
            order.setStatus(MarketplaceOrder.OrderStatus.CANCELLED);
            order.setPaymentStatus(MarketplaceOrder.PaymentStatus.REFUNDED);
            order.setCancelledAt(LocalDateTime.now());
            order.setCancellationReason("Cancelled by buyer");
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            // Restore item quantity
            MarketplaceItem item = order.getItem();
            item.setQuantity(item.getQuantity() + order.getQuantity());
            if (item.getStatus() == MarketplaceItem.ItemStatus.SOLD) {
                item.setStatus(MarketplaceItem.ItemStatus.ACTIVE);
            }
            marketplaceItemRepository.save(item);

            log.info("Order cancelled successfully: {}", orderId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Order cancelled successfully"
            ));

        } catch (Exception e) {
            log.error("Failed to cancel order", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to cancel order: " + e.getMessage()
            ));
        }
    }

    /**
     * Complete an order and release payment to seller
     */
    @PostMapping("/{orderId}/complete")
    @Operation(summary = "Complete order", description = "Mark order as completed and release payment to seller")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> completeOrder(@PathVariable Long orderId) {
        try {
            User currentUser = getCurrentUser();

            MarketplaceOrder order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            // Check if user is authorized (buyer confirms receipt)
            if (!order.getBuyer().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Only the buyer can complete this order"
                ));
            }

            // Check if order can be completed
            if (order.getStatus() != MarketplaceOrder.OrderStatus.CONFIRMED &&
                    order.getStatus() != MarketplaceOrder.OrderStatus.SHIPPED) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Order cannot be completed in current status: " + order.getStatus()
                ));
            }

            // Release escrow payment to seller
            walletService.releaseEscrow(
                    "ORDER-" + order.getId(),
                    order.getSeller().getId(),
                    "Payment for order: " + order.getOrderNumber()
            );

            // Update order status
            order.setStatus(MarketplaceOrder.OrderStatus.COMPLETED);
            order.setPaymentStatus(MarketplaceOrder.PaymentStatus.RELEASED);
            order.setDeliveredAt(LocalDateTime.now());
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            log.info("Order completed successfully: {}", orderId);

            // Notify seller
            notificationService.sendNotification(
                    order.getSeller().getId(),
                    Notification.NotificationType.LOTTERY_WINNER,
                    "💰 Payment Released!",
                    String.format("Payment for order %s has been released to your wallet", order.getOrderNumber())
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Order completed successfully"
            ));

        } catch (Exception e) {
            log.error("Failed to complete order", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to complete order: " + e.getMessage()
            ));
        }
    }

    /**
     * Mark order as shipped (seller action)
     */
    @PostMapping("/{orderId}/ship")
    @Operation(summary = "Ship order", description = "Mark order as shipped")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> shipOrder(@PathVariable Long orderId,
                                       @RequestBody(required = false) ShipOrderRequest shipRequest) {
        try {
            User currentUser = getCurrentUser();

            MarketplaceOrder order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            // Check if user is the seller
            if (!order.getSeller().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Only the seller can ship this order"
                ));
            }

            // Check if order can be shipped
            if (order.getStatus() != MarketplaceOrder.OrderStatus.CONFIRMED) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Order cannot be shipped in current status: " + order.getStatus()
                ));
            }

            // Update order with shipping info
            order.setStatus(MarketplaceOrder.OrderStatus.SHIPPED);
            order.setShippedAt(LocalDateTime.now());
            if (shipRequest != null) {
                order.setTrackingNumber(shipRequest.getTrackingNumber());
                order.setShippingCarrier(shipRequest.getCarrier());
            }
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            log.info("Order shipped: {}", orderId);

            // Notify buyer
            notificationService.sendNotification(
                    order.getBuyer().getId(),
                    Notification.NotificationType.SYSTEM_MAINTENANCE,
                    "📦 Order Shipped!",
                    String.format("Your order %s has been shipped. %s",
                            order.getOrderNumber(),
                            shipRequest != null && shipRequest.getTrackingNumber() != null ?
                                    "Tracking: " + shipRequest.getTrackingNumber() : "")
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Order marked as shipped"
            ));

        } catch (Exception e) {
            log.error("Failed to ship order", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to ship order: " + e.getMessage()
            ));
        }
    }

    // Utility methods
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    // Request DTOs (inner classes)
    @lombok.Data
    public static class CreateOrderRequest {
        @NotNull(message = "Item ID is required")
        private Long itemId;

        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        private String shippingAddress;
        private String notes;
    }

    @lombok.Data
    public static class ShipOrderRequest {
        private String trackingNumber;
        private String carrier;
    }
}