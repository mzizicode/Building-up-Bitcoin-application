package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository for MarketplaceItem operations with enhanced store support
 */
@Repository
interface MarketplaceItemRepository extends JpaRepository<MarketplaceItem, Long> {

    /**
     * Find items by seller (for user stores) - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.seller.id = :sellerId ORDER BY m.createdAt DESC")
    List<MarketplaceItem> findBySellerId(@Param("sellerId") Long sellerId);

    /**
     * Find active items by seller (for public store view) - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.seller.id = :sellerId AND m.status = 'ACTIVE' ORDER BY m.createdAt DESC")
    List<MarketplaceItem> findActiveItemsBySellerId(@Param("sellerId") Long sellerId);

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
     * Search by title or description - WITH EAGER LOADING FOR SELLER
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE (LOWER(m.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(m.description) LIKE LOWER(CONCAT('%', :query, '%'))) AND m.status = 'ACTIVE' ORDER BY m.createdAt DESC")
    List<MarketplaceItem> searchByTitleOrDescription(@Param("query") String query,
                                                     @Param("offset") int offset,
                                                     @Param("limit") int limit);

    /**
     * Find active listings - WITH EAGER LOADING FOR SELLER
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.status = 'ACTIVE' ORDER BY m.createdAt DESC")
    List<MarketplaceItem> findActiveListings(@Param("offset") int offset,
                                             @Param("limit") int limit);

    /**
     * Find featured items (most viewed and favorited) - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.status = 'ACTIVE' ORDER BY (m.viewsCount + m.favoritesCount) DESC")
    List<MarketplaceItem> findFeaturedItems(@Param("limit") int limit);

    /**
     * Find recent listings - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.status = 'ACTIVE' ORDER BY m.createdAt DESC")
    List<MarketplaceItem> findRecentListings(@Param("limit") int limit);

    /**
     * Find items in price range - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.price BETWEEN :minPrice AND :maxPrice AND m.status = 'ACTIVE'")
    List<MarketplaceItem> findByPriceRange(@Param("minPrice") BigDecimal minPrice,
                                           @Param("maxPrice") BigDecimal maxPrice);

    /**
     * NEW: Get popular stores (sellers with most active items) - WITH EAGER LOADING
     */
    @Query("SELECT m.seller, COUNT(m) as itemCount FROM MarketplaceItem m " +
            "WHERE m.status = 'ACTIVE' " +
            "GROUP BY m.seller " +
            "ORDER BY itemCount DESC")
    List<Object[]> findPopularStores(@Param("limit") int limit);

    /**
     * NEW: Get store statistics for a seller
     */
    @Query("SELECT " +
            "COUNT(m) as totalItems, " +
            "COUNT(CASE WHEN m.status = 'ACTIVE' THEN 1 END) as activeItems, " +
            "COUNT(CASE WHEN m.status = 'SOLD' THEN 1 END) as soldItems, " +
            "SUM(m.viewsCount) as totalViews, " +
            "SUM(m.favoritesCount) as totalFavorites " +
            "FROM MarketplaceItem m WHERE m.seller.id = :sellerId")
    Object[] getStoreStatistics(@Param("sellerId") Long sellerId);

    /**
     * NEW: Find similar items from same store - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.seller.id = :sellerId AND m.id != :itemId AND m.status = 'ACTIVE' ORDER BY m.createdAt DESC")
    List<MarketplaceItem> findSimilarItemsFromStore(@Param("sellerId") Long sellerId, @Param("itemId") Long itemId);

    /**
     * NEW: Find items by seller and category - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.seller.id = :sellerId AND m.category.id = :categoryId AND m.status = 'ACTIVE' ORDER BY m.createdAt DESC")
    List<MarketplaceItem> findBySellerIdAndCategoryId(@Param("sellerId") Long sellerId, @Param("categoryId") Long categoryId);

    /**
     * Count items by status
     */
    Long countByStatus(MarketplaceItem.ItemStatus status);

    /**
     * NEW: Count active items by seller
     */
    @Query("SELECT COUNT(m) FROM MarketplaceItem m WHERE m.seller.id = :sellerId AND m.status = 'ACTIVE'")
    Long countActiveItemsBySellerId(@Param("sellerId") Long sellerId);

    /**
     * NEW: Find top selling items (most views/favorites) from a store - WITH EAGER LOADING
     */
    @Query("SELECT m FROM MarketplaceItem m JOIN FETCH m.seller WHERE m.seller.id = :sellerId AND m.status = 'ACTIVE' ORDER BY (m.viewsCount + m.favoritesCount) DESC")
    List<MarketplaceItem> findTopSellingItemsFromStore(@Param("sellerId") Long sellerId);
}