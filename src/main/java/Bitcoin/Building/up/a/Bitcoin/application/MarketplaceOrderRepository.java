package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketplaceOrderRepository extends JpaRepository<MarketplaceOrder, Long> {

    // Find orders by buyer
    List<MarketplaceOrder> findByBuyerId(Long buyerId);

    // Find orders by seller
    List<MarketplaceOrder> findBySellerId(Long sellerId);

    // Find orders by buyer or seller
    @Query("SELECT o FROM MarketplaceOrder o WHERE o.buyer.id = :userId OR o.seller.id = :userId")
    List<MarketplaceOrder> findByBuyerIdOrSellerId(@Param("userId") Long userId);

    // Find by order number
    Optional<MarketplaceOrder> findByOrderNumber(String orderNumber);

    // Find orders by status
    List<MarketplaceOrder> findByStatus(MarketplaceOrder.OrderStatus status);

    // Find orders by buyer and status
    List<MarketplaceOrder> findByBuyerIdAndStatus(Long buyerId, MarketplaceOrder.OrderStatus status);

    // Find orders by seller and status
    List<MarketplaceOrder> findBySellerIdAndStatus(Long sellerId, MarketplaceOrder.OrderStatus status);

    // Find orders by item
    List<MarketplaceOrder> findByItemId(Long itemId);

    // Find orders by payment status
    List<MarketplaceOrder> findByPaymentStatus(MarketplaceOrder.PaymentStatus paymentStatus);

    // Count orders by buyer
    long countByBuyerId(Long buyerId);

    // Count orders by seller
    long countBySellerId(Long sellerId);

    // Find recent orders for a user (buyer or seller)
    @Query("SELECT o FROM MarketplaceOrder o WHERE (o.buyer.id = :userId OR o.seller.id = :userId) " +
            "ORDER BY o.createdAt DESC")
    List<MarketplaceOrder> findRecentOrdersByUserId(@Param("userId") Long userId);

    // Find pending orders that need processing
    @Query("SELECT o FROM MarketplaceOrder o WHERE o.status = 'PENDING' " +
            "AND o.paymentStatus = 'ESCROWED' ORDER BY o.createdAt ASC")
    List<MarketplaceOrder> findPendingOrdersForProcessing();
}
