package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MarketplaceService {

    private final MarketplaceItemRepository marketplaceItemRepository;
    private final MarketplaceCategoryRepository marketplaceCategoryRepository;
    private final MarketplaceFavoriteRepository marketplaceFavoriteRepository;
    private final WalletService walletService;
    private final S3Service s3Service;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Create a new marketplace listing
     */
    @Transactional
    public MarketplaceItem createListing(CreateListingRequest request, Long sellerId) {
        User seller = userRepository.findById(sellerId)
                .orElseThrow(() -> new RuntimeException("Seller not found"));

        MarketplaceCategory category = null;
        if (request.getCategoryId() != null) {
            category = marketplaceCategoryRepository.findById(request.getCategoryId())
                    .orElse(null);
        }

        // Parse images JSON string to List if needed
        List<String> imagesList = parseImagesJson(request.getImagesJson());

        MarketplaceItem item = MarketplaceItem.builder()
                .seller(seller)
                .category(category)
                .title(request.getTitle())
                .description(request.getDescription())
                .price(request.getPrice())
                .originalPrice(request.getOriginalPrice())
                .condition(request.getCondition() != null ? request.getCondition() : MarketplaceItem.ItemCondition.NEW)
                .quantity(request.getQuantity() != null ? request.getQuantity() : 1)
                .status(request.getStatus() != null ? request.getStatus() : MarketplaceItem.ItemStatus.ACTIVE)
                .images(imagesList)
                .tags(request.getTags() != null ? request.getTags().toArray(new String[0]) : null)
                .location(sanitizeInput(request.getLocation()))
                .isNegotiable(request.getIsNegotiable() != null ? request.getIsNegotiable() : false)
                .build();

        MarketplaceItem savedItem = marketplaceItemRepository.save(item);
        log.info("Created marketplace item {} in {}'s store", savedItem.getId(), seller.getName());

        // Award coins for listing item
        walletService.awardCoins(
                sellerId,
                BigDecimal.valueOf(10),
                CoinTransaction.TransactionCategory.ACHIEVEMENT_UNLOCK,
                "Listed new item in store: " + request.getTitle()
        );

        return savedItem;
    }

    /**
     * Upload images for a listing
     */
    public List<String> uploadListingImages(List<MultipartFile> images, Long sellerId) {
        List<String> imageUrls = new ArrayList<>();

        for (MultipartFile image : images) {
            try {
                String imageUrl = s3Service.uploadFile(image);
                imageUrls.add(imageUrl);
                log.info("Successfully uploaded image for seller {}: {}", sellerId, imageUrl);
            } catch (Exception e) {
                log.error("Failed to upload image for seller {}: {}", sellerId, e.getMessage());
            }
        }

        return imageUrls;
    }

    /**
     * Update listing
     */
    @Transactional
    public MarketplaceItem updateListing(Long itemId, UpdateListingRequest request, Long sellerId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getSeller().getId().equals(sellerId)) {
            throw new RuntimeException("Unauthorized: You can only edit items in your own store");
        }

        // Update fields if provided
        if (request.getTitle() != null) {
            item.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            item.setDescription(request.getDescription());
        }
        if (request.getPrice() != null) {
            item.setPrice(request.getPrice());
        }
        if (request.getOriginalPrice() != null) {
            item.setOriginalPrice(request.getOriginalPrice());
        }
        if (request.getQuantity() != null) {
            item.setQuantity(request.getQuantity());
        }
        if (request.getStatus() != null) {
            item.setStatus(request.getStatus());
        }
        if (request.getImagesJson() != null) {
            item.setImages(parseImagesJson(request.getImagesJson()));
        }
        if (request.getTags() != null) {
            item.setTags(request.getTags().toArray(new String[0]));
        }
        if (request.getLocation() != null) {
            item.setLocation(sanitizeInput(request.getLocation()));
        }
        if (request.getIsNegotiable() != null) {
            item.setIsNegotiable(request.getIsNegotiable());
        }

        item.setUpdatedAt(LocalDateTime.now());

        return marketplaceItemRepository.save(item);
    }

    /**
     * Get listing by ID - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public MarketplaceItem getListing(Long itemId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        // Increment view count
        item.incrementViewCount();
        marketplaceItemRepository.save(item);

        return item;
    }

    /**
     * Search listings across all stores - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public List<MarketplaceItem> searchListings(String query, Long categoryId,
                                                BigDecimal minPrice, BigDecimal maxPrice,
                                                MarketplaceItem.ItemCondition condition,
                                                String location, int page, int size) {
        if (query != null && !query.trim().isEmpty()) {
            return marketplaceItemRepository.searchByTitleOrDescription(query, page * size, size);
        }

        return marketplaceItemRepository.findActiveListings(page * size, size);
    }

    /**
     * Get listings by seller (user's store) - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public List<MarketplaceItem> getSellerListings(Long sellerId) {
        return marketplaceItemRepository.findBySellerId(sellerId);
    }

    /**
     * Get active listings by category - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public List<MarketplaceItem> getCategoryListings(Long categoryId, int page, int size) {
        return marketplaceItemRepository.findByCategoryIdAndStatus(
                categoryId,
                MarketplaceItem.ItemStatus.ACTIVE,
                page * size,
                size
        );
    }

    /**
     * NEW: Get popular stores - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPopularStores(int limit) {
        try {
            // Get users who have the most active listings
            List<Object[]> results = marketplaceItemRepository.findPopularStores(limit);

            List<Map<String, Object>> popularStores = new ArrayList<>();

            for (Object[] result : results) {
                User seller = (User) result[0];
                Long itemCount = (Long) result[1];

                Map<String, Object> storeInfo = new HashMap<>();
                storeInfo.put("storeId", seller.getId());
                storeInfo.put("storeName", seller.getName() + "'s Store");
                storeInfo.put("sellerName", seller.getName());
                storeInfo.put("itemCount", itemCount);
                storeInfo.put("memberSince", seller.getCreatedAt());

                popularStores.add(storeInfo);
            }

            return popularStores;

        } catch (Exception e) {
            log.error("Failed to get popular stores", e);
            return new ArrayList<>();
        }
    }

    /**
     * NEW: Toggle favorite item
     */
    @Transactional
    public boolean toggleFavorite(Long userId, Long itemId) {
        try {
            Optional<MarketplaceFavorite> existingFavorite =
                    marketplaceFavoriteRepository.findByUserIdAndItemId(userId, itemId);

            if (existingFavorite.isPresent()) {
                // Remove from favorites
                marketplaceFavoriteRepository.delete(existingFavorite.get());

                // Update item's favorite count
                MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                        .orElseThrow(() -> new RuntimeException("Item not found"));
                item.setFavoritesCount(Math.max(0, item.getFavoritesCount() - 1));
                marketplaceItemRepository.save(item);

                return false; // Not favorited anymore
            } else {
                // Add to favorites
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                        .orElseThrow(() -> new RuntimeException("Item not found"));

                MarketplaceFavorite favorite = MarketplaceFavorite.builder()
                        .user(user)
                        .item(item)
                        .createdAt(LocalDateTime.now())
                        .build();

                marketplaceFavoriteRepository.save(favorite);

                // Update item's favorite count
                item.setFavoritesCount(item.getFavoritesCount() + 1);
                marketplaceItemRepository.save(item);

                return true; // Now favorited
            }
        } catch (Exception e) {
            log.error("Failed to toggle favorite", e);
            throw new RuntimeException("Failed to toggle favorite");
        }
    }

    /**
     * NEW: Get user's favorite items - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public List<MarketplaceItem> getUserFavorites(Long userId) {
        return marketplaceFavoriteRepository.findItemsByUserId(userId);
    }

    /**
     * Delete listing (soft delete)
     */
    @Transactional
    public void deleteListing(Long itemId, Long sellerId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getSeller().getId().equals(sellerId)) {
            throw new RuntimeException("Unauthorized: You can only delete items from your own store");
        }

        item.setStatus(MarketplaceItem.ItemStatus.DELETED);
        item.setUpdatedAt(LocalDateTime.now());
        marketplaceItemRepository.save(item);

        log.info("Soft deleted listing {} from {}'s store", itemId, item.getSeller().getName());
    }

    /**
     * Mark item as sold
     */
    @Transactional
    public void markAsSold(Long itemId, Long sellerId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getSeller().getId().equals(sellerId)) {
            throw new RuntimeException("Unauthorized: You can only update items in your own store");
        }

        item.setStatus(MarketplaceItem.ItemStatus.SOLD);
        item.setQuantity(0);
        item.setUpdatedAt(LocalDateTime.now());
        marketplaceItemRepository.save(item);

        log.info("Marked item {} as sold in {}'s store", itemId, item.getSeller().getName());
    }

    /**
     * Get featured/trending items from all stores - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public List<MarketplaceItem> getFeaturedItems(int limit) {
        return marketplaceItemRepository.findFeaturedItems(limit);
    }

    /**
     * Get recently listed items from all stores - WITH EAGER LOADING
     */
    @Transactional(readOnly = true)
    public List<MarketplaceItem> getRecentListings(int limit) {
        return marketplaceItemRepository.findRecentListings(limit);
    }

    /**
     * Helper method to parse images JSON string to List
     */
    private List<String> parseImagesJson(String imagesJson) {
        if (imagesJson == null || imagesJson.trim().isEmpty()) {
            return new ArrayList<>();
        }

        // If it's already a valid JSON array string, parse it
        if (imagesJson.startsWith("[") && imagesJson.endsWith("]")) {
            try {
                String cleaned = imagesJson.substring(1, imagesJson.length() - 1);
                if (cleaned.isEmpty()) {
                    return new ArrayList<>();
                }

                return Arrays.stream(cleaned.split(","))
                        .map(s -> s.trim().replaceAll("\"", ""))
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            } catch (Exception e) {
                log.error("Failed to parse images JSON: {}", e.getMessage());
                return new ArrayList<>();
            }
        }

        // If it's a single URL string, convert to list
        return Collections.singletonList(imagesJson);
    }

    /**
     * Sanitize input to prevent XSS
     */
    private String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        return input.replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll("\"", "&quot;")
                .replaceAll("'", "&#x27;")
                .replaceAll("/", "&#x2F;");
    }

    /**
     * Request DTOs
     */
    public static class CreateListingRequest {
        private String title;
        private String description;
        private BigDecimal price;
        private BigDecimal originalPrice;
        private Long categoryId;
        private MarketplaceItem.ItemCondition condition;
        private Integer quantity;
        private MarketplaceItem.ItemStatus status;
        private String imagesJson;
        private List<String> tags;
        private String location;
        private Boolean isNegotiable;

        // Getters and setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }

        public BigDecimal getOriginalPrice() { return originalPrice; }
        public void setOriginalPrice(BigDecimal originalPrice) { this.originalPrice = originalPrice; }

        public Long getCategoryId() { return categoryId; }
        public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

        public MarketplaceItem.ItemCondition getCondition() { return condition; }
        public void setCondition(MarketplaceItem.ItemCondition condition) { this.condition = condition; }

        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }

        public MarketplaceItem.ItemStatus getStatus() { return status; }
        public void setStatus(MarketplaceItem.ItemStatus status) { this.status = status; }

        public String getImagesJson() { return imagesJson; }
        public void setImagesJson(String imagesJson) { this.imagesJson = imagesJson; }

        public List<String> getTags() { return tags; }
        public void setTags(List<String> tags) { this.tags = tags; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public Boolean getIsNegotiable() { return isNegotiable; }
        public void setIsNegotiable(Boolean isNegotiable) { this.isNegotiable = isNegotiable; }
    }

    public static class UpdateListingRequest extends CreateListingRequest {
        // Inherits all fields from CreateListingRequest
        // All fields are optional for updates
    }
}