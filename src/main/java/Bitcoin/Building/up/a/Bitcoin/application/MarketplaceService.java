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
    private final WalletService walletService;
    private final S3Service s3Service;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Create a new marketplace listing
     */
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
        log.info("Created marketplace item {} by seller {}", savedItem.getId(), sellerId);

        // Award coins for listing item
        walletService.awardCoins(
                sellerId,
                BigDecimal.valueOf(10),
                CoinTransaction.TransactionCategory.ACHIEVEMENT_UNLOCK,
                "Listed new item: " + request.getTitle()
        );

        return savedItem;
    }

    /**
     * Upload images for a listing
     * FIXED: Now properly calls S3Service.uploadFile with single MultipartFile parameter
     */
    public List<String> uploadListingImages(List<MultipartFile> images, Long sellerId) {
        List<String> imageUrls = new ArrayList<>();

        for (MultipartFile image : images) {
            try {
                // S3Service.uploadFile handles the file naming internally
                // Just pass the MultipartFile
                String imageUrl = s3Service.uploadFile(image);
                imageUrls.add(imageUrl);
                log.info("Successfully uploaded image for seller {}: {}", sellerId, imageUrl);
            } catch (Exception e) {
                log.error("Failed to upload image for seller {}: {}", sellerId, e.getMessage());
                // Continue processing other images even if one fails
            }
        }

        return imageUrls;
    }

    /**
     * Alternative method to upload a single image
     */
    public String uploadSingleImage(MultipartFile image, Long sellerId) {
        try {
            String imageUrl = s3Service.uploadFile(image);
            log.info("Successfully uploaded single image for seller {}: {}", sellerId, imageUrl);
            return imageUrl;
        } catch (Exception e) {
            log.error("Failed to upload image for seller {}: {}", sellerId, e.getMessage());
            throw new RuntimeException("Failed to upload image: " + e.getMessage());
        }
    }

    /**
     * Update listing
     */
    public MarketplaceItem updateListing(Long itemId, UpdateListingRequest request, Long sellerId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getSeller().getId().equals(sellerId)) {
            throw new RuntimeException("Unauthorized: You can only edit your own listings");
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
     * Get listing by ID
     */
    public MarketplaceItem getListing(Long itemId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        // Increment view count
        item.incrementViewCount();
        marketplaceItemRepository.save(item);

        return item;
    }

    /**
     * Search listings
     */
    public List<MarketplaceItem> searchListings(String query, Long categoryId,
                                                BigDecimal minPrice, BigDecimal maxPrice,
                                                MarketplaceItem.ItemCondition condition,
                                                String location, int page, int size) {
        // This would typically use a more sophisticated search (Elasticsearch, etc.)
        // For now, using simple repository queries

        if (query != null && !query.trim().isEmpty()) {
            return marketplaceItemRepository.searchByTitleOrDescription(query, page * size, size);
        }

        return marketplaceItemRepository.findActiveListings(page * size, size);
    }

    /**
     * Get listings by seller
     */
    public List<MarketplaceItem> getSellerListings(Long sellerId) {
        return marketplaceItemRepository.findBySellerId(sellerId);
    }

    /**
     * Get active listings by category
     */
    public List<MarketplaceItem> getCategoryListings(Long categoryId, int page, int size) {
        return marketplaceItemRepository.findByCategoryIdAndStatus(
                categoryId,
                MarketplaceItem.ItemStatus.ACTIVE,
                page * size,
                size
        );
    }

    /**
     * Delete listing (soft delete)
     */
    public void deleteListing(Long itemId, Long sellerId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getSeller().getId().equals(sellerId)) {
            throw new RuntimeException("Unauthorized: You can only delete your own listings");
        }

        item.setStatus(MarketplaceItem.ItemStatus.DELETED);
        item.setUpdatedAt(LocalDateTime.now());
        marketplaceItemRepository.save(item);

        log.info("Soft deleted listing {} by seller {}", itemId, sellerId);
    }

    /**
     * Mark item as sold
     */
    public void markAsSold(Long itemId, Long sellerId) {
        MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getSeller().getId().equals(sellerId)) {
            throw new RuntimeException("Unauthorized: You can only update your own listings");
        }

        item.setStatus(MarketplaceItem.ItemStatus.SOLD);
        item.setQuantity(0);
        item.setUpdatedAt(LocalDateTime.now());
        marketplaceItemRepository.save(item);

        log.info("Marked item {} as sold", itemId);
    }

    /**
     * Get featured/trending items
     */
    public List<MarketplaceItem> getFeaturedItems(int limit) {
        return marketplaceItemRepository.findFeaturedItems(limit);
    }

    /**
     * Get recently listed items
     */
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
                // Simple JSON array parsing
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
        // Basic sanitization - in production, use a library like OWASP Java HTML Sanitizer
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
        private String imagesJson; // JSON string of image URLs
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