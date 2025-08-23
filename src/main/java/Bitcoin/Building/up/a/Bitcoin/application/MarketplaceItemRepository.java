package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository for MarketplaceItem operations
 */
@Repository
interface MarketplaceItemRepository extends JpaRepository<MarketplaceItem, Long> {

    /**
     * Find items by seller
     */
    List<MarketplaceItem> findBySellerId(Long sellerId);

    /**
     * Find items by category
     */
    List<MarketplaceItem> findByCategoryId(Long categoryId);

    /**
     * Find active items by category with pagination
     */
    @Query(value = "SELECT * FROM marketplace_items WHERE category_id = :categoryId AND status = :status ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
            nativeQuery = true)
    List<MarketplaceItem> findByCategoryIdAndStatus(@Param("categoryId") Long categoryId,
                                                    @Param("status") MarketplaceItem.ItemStatus status,
                                                    @Param("offset") int offset,
                                                    @Param("limit") int limit);

    /**
     * Search by title or description
     */
    @Query(value = "SELECT * FROM marketplace_items WHERE (LOWER(title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(description) LIKE LOWER(CONCAT('%', :query, '%'))) AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
            nativeQuery = true)
    List<MarketplaceItem> searchByTitleOrDescription(@Param("query") String query,
                                                     @Param("offset") int offset,
                                                     @Param("limit") int limit);

    /**
     * Find active listings
     */
    @Query(value = "SELECT * FROM marketplace_items WHERE status = 'ACTIVE' ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
            nativeQuery = true)
    List<MarketplaceItem> findActiveListings(@Param("offset") int offset,
                                             @Param("limit") int limit);

    /**
     * Find featured items (most viewed and favorited)
     */
    @Query(value = "SELECT * FROM marketplace_items WHERE status = 'ACTIVE' ORDER BY (views_count + favorites_count) DESC LIMIT :limit",
            nativeQuery = true)
    List<MarketplaceItem> findFeaturedItems(@Param("limit") int limit);

    /**
     * Find recent listings
     */
    @Query(value = "SELECT * FROM marketplace_items WHERE status = 'ACTIVE' ORDER BY created_at DESC LIMIT :limit",
            nativeQuery = true)
    List<MarketplaceItem> findRecentListings(@Param("limit") int limit);

    /**
     * Find items in price range
     */
    @Query("SELECT m FROM MarketplaceItem m WHERE m.price BETWEEN :minPrice AND :maxPrice AND m.status = 'ACTIVE'")
    List<MarketplaceItem> findByPriceRange(@Param("minPrice") BigDecimal minPrice,
                                           @Param("maxPrice") BigDecimal maxPrice);


    Long countByStatus(MarketplaceItem.ItemStatus status);
}

