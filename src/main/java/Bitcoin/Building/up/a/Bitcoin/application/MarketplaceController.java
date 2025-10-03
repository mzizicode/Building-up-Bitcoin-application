package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace")
@CrossOrigin(origins = "*")
@Tag(name = "Marketplace", description = "Marketplace endpoints for buying and selling items")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;
    private final UserRepository userRepository;
    private final MarketplaceItemRepository marketplaceItemRepository;

    /**
     * Get all marketplace items with proper search/filter
     */
    @GetMapping("/items")
    @Transactional(readOnly = true)
    @Operation(summary = "Get marketplace items", description = "Get marketplace items with search and filters")
    public ResponseEntity<?> getMarketplaceItems(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) MarketplaceItem.ItemCondition condition,
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "newest") String sortBy) {
        try {
            List<MarketplaceItem> items = marketplaceService.searchListings(
                    query, categoryId, minPrice, maxPrice, condition, location, page, size
            );

            List<Map<String, Object>> itemResponses = items.stream()
                    .map(this::createItemResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "items", itemResponses,
                    "totalPages", (items.size() + size - 1) / size,
                    "currentPage", page,
                    "pageSize", size
            ));

        } catch (Exception e) {
            log.error("Failed to get marketplace items", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve marketplace items: " + e.getMessage()
            ));
        }
    }

    /**
     * NEW: Get user's store/shop - PUBLIC ACCESS
     */
    @GetMapping("/store/{userId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Get user store", description = "Get all items from a specific user's store")
    public ResponseEntity<?> getUserStore(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "newest") String sortBy) {
        try {
            // Get seller information
            User seller = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User/Store not found"));

            // Get seller's items
            List<MarketplaceItem> storeItems = marketplaceService.getSellerListings(userId);

            // Apply sorting
            storeItems = applySorting(storeItems, sortBy);

            // Apply pagination
            int totalItems = storeItems.size();
            int startIndex = page * size;
            int endIndex = Math.min(startIndex + size, totalItems);
            List<MarketplaceItem> paginatedItems = storeItems.subList(startIndex, endIndex);

            List<Map<String, Object>> itemResponses = paginatedItems.stream()
                    .map(this::createItemResponse)
                    .collect(Collectors.toList());

            // Store statistics
            long activeItems = storeItems.stream()
                    .filter(item -> item.getStatus() == MarketplaceItem.ItemStatus.ACTIVE)
                    .count();

            Map<String, Object> storeInfo = new HashMap<>();
            storeInfo.put("storeId", userId);
            storeInfo.put("storeName", seller.getName() + "'s Store");
            storeInfo.put("sellerName", seller.getName());
            storeInfo.put("sellerEmail", seller.getEmail());
            storeInfo.put("totalItems", totalItems);
            storeInfo.put("activeItems", activeItems);
            storeInfo.put("memberSince", seller.getCreatedAt());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "store", storeInfo,
                    "items", itemResponses,
                    "totalPages", (totalItems + size - 1) / size,
                    "currentPage", page,
                    "pageSize", size,
                    "totalItems", totalItems
            ));

        } catch (Exception e) {
            log.error("Failed to get user store", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve store: " + e.getMessage()
            ));
        }
    }

    /**
     * NEW: Get current user's own store - AUTHENTICATED
     */
    @GetMapping("/my-store")
    @Transactional(readOnly = true)
    @Operation(summary = "Get my store", description = "Get current user's store items")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getMyStore(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "newest") String sortBy) {
        try {
            User currentUser = getCurrentUser();
            return getUserStore(currentUser.getId(), page, size, sortBy);
        } catch (Exception e) {
            log.error("Failed to get my store", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve your store: " + e.getMessage()
            ));
        }
    }

    /**
     * NEW: Get popular stores
     */
    @GetMapping("/stores/popular")
    @Transactional(readOnly = true)
    @Operation(summary = "Get popular stores", description = "Get stores with most items or activity")
    public ResponseEntity<?> getPopularStores(@RequestParam(defaultValue = "10") int limit) {
        try {
            List<Map<String, Object>> popularStores = marketplaceService.getPopularStores(limit);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "stores", popularStores
            ));

        } catch (Exception e) {
            log.error("Failed to get popular stores", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve popular stores"
            ));
        }
    }

    /**
     * Create marketplace item with proper request handling
     */
    @PostMapping("/items")
    @Transactional
    @Operation(summary = "Create marketplace item", description = "Create a new marketplace item")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> createMarketplaceItem(@Valid @RequestBody CreateItemRequest request) {
        try {
            User currentUser = getCurrentUser();
            log.info("Creating marketplace item for user: {}", currentUser.getId());

            // Validate request
            if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Title is required"
                ));
            }

            if (request.getPrice() == null || request.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Valid price is required"
                ));
            }

            // Create listing request
            MarketplaceService.CreateListingRequest listingRequest = new MarketplaceService.CreateListingRequest();
            listingRequest.setTitle(request.getTitle());
            listingRequest.setDescription(request.getDescription());
            listingRequest.setPrice(request.getPrice());
            listingRequest.setOriginalPrice(request.getOriginalPrice());
            listingRequest.setCategoryId(request.getCategoryId());
            listingRequest.setCondition(request.getCondition() != null ? request.getCondition() : MarketplaceItem.ItemCondition.NEW);
            listingRequest.setQuantity(request.getQuantity() != null ? request.getQuantity() : 1);
            listingRequest.setStatus(MarketplaceItem.ItemStatus.ACTIVE);
            listingRequest.setImagesJson(request.getImages() != null ? String.join(",", request.getImages()) : "[]");
            listingRequest.setLocation(request.getLocation());
            listingRequest.setIsNegotiable(request.getIsNegotiable() != null ? request.getIsNegotiable() : false);

            MarketplaceItem item = marketplaceService.createListing(listingRequest, currentUser.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Item added to your store successfully!",
                    "item", createItemResponse(item),
                    "storeUrl", "/marketplace/store/" + currentUser.getId()
            ));

        } catch (Exception e) {
            log.error("Failed to create marketplace item", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to create item: " + e.getMessage()
            ));
        }
    }

    /**
     * Upload marketplace item images
     */
    @PostMapping("/items/upload-images")
    @Operation(summary = "Upload item images", description = "Upload images for marketplace items")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> uploadItemImages(@RequestParam("images") List<MultipartFile> images) {
        try {
            User currentUser = getCurrentUser();
            List<String> imageUrls = marketplaceService.uploadListingImages(images, currentUser.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "imageUrls", imageUrls,
                    "count", imageUrls.size()
            ));

        } catch (Exception e) {
            log.error("Failed to upload marketplace images", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to upload images: " + e.getMessage()
            ));
        }
    }

    /**
     * Get marketplace categories
     */
    @GetMapping("/categories")
    @Operation(summary = "Get categories", description = "Get all marketplace categories")
    public ResponseEntity<?> getCategories() {
        try {
            List<Map<String, Object>> categories = List.of(
                    Map.of("id", "1", "name", "Photography"),
                    Map.of("id", "2", "name", "Electronics"),
                    Map.of("id", "3", "name", "Books"),
                    Map.of("id", "4", "name", "Travel"),
                    Map.of("id", "5", "name", "Art & Crafts"),
                    Map.of("id", "6", "name", "Sports & Recreation")
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "categories", categories
            ));

        } catch (Exception e) {
            log.error("Failed to get categories", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to get categories"
            ));
        }
    }

    /**
     * View item (increment view count)
     */
    @PostMapping("/items/{itemId}/view")
    @Transactional
    @Operation(summary = "View item", description = "Increment view count for an item")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> viewItem(@PathVariable Long itemId) {
        try {
            MarketplaceItem item = marketplaceItemRepository.findById(itemId)
                    .orElseThrow(() -> new RuntimeException("Item not found"));

            item.incrementViewCount();
            marketplaceItemRepository.save(item);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "viewCount", item.getViewsCount()
            ));

        } catch (Exception e) {
            log.error("Failed to increment view count", e);
            return ResponseEntity.ok(Map.of("success", false));
        }
    }

    /**
     * Favorite/unfavorite item
     */
    @PostMapping("/items/{itemId}/favorite")
    @Transactional
    @Operation(summary = "Toggle favorite", description = "Add or remove item from favorites")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> toggleFavorite(@PathVariable Long itemId) {
        try {
            User currentUser = getCurrentUser();
            boolean favorited = marketplaceService.toggleFavorite(currentUser.getId(), itemId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "favorited", favorited
            ));

        } catch (Exception e) {
            log.error("Failed to toggle favorite", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to toggle favorite"
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

    private List<MarketplaceItem> applySorting(List<MarketplaceItem> items, String sortBy) {
        switch (sortBy) {
            case "price_asc":
                return items.stream()
                        .sorted((a, b) -> a.getPrice().compareTo(b.getPrice()))
                        .collect(Collectors.toList());
            case "price_desc":
                return items.stream()
                        .sorted((a, b) -> b.getPrice().compareTo(a.getPrice()))
                        .collect(Collectors.toList());
            case "oldest":
                return items.stream()
                        .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                        .collect(Collectors.toList());
            case "views":
                return items.stream()
                        .sorted((a, b) -> Integer.compare(b.getViewsCount(), a.getViewsCount()))
                        .collect(Collectors.toList());
            case "favorites":
                return items.stream()
                        .sorted((a, b) -> Integer.compare(b.getFavoritesCount(), a.getFavoritesCount()))
                        .collect(Collectors.toList());
            default: // newest
                return items.stream()
                        .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                        .collect(Collectors.toList());
        }
    }

    private Map<String, Object> createItemResponse(MarketplaceItem item) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", item.getId());
        response.put("title", item.getTitle());
        response.put("description", item.getDescription());
        response.put("price", item.getPrice());
        response.put("originalPrice", item.getOriginalPrice());
        response.put("discountPercentage", item.getDiscountPercentage());
        response.put("condition", item.getCondition() != null ? item.getCondition().toString() : "NEW");
        response.put("quantity", item.getQuantity());
        response.put("status", item.getStatus() != null ? item.getStatus().toString() : "ACTIVE");
        response.put("images", item.getImages());
        response.put("tags", item.getTags());
        response.put("location", item.getLocation());
        response.put("isNegotiable", item.getIsNegotiable());
        response.put("viewsCount", item.getViewsCount());
        response.put("favoritesCount", item.getFavoritesCount());
        response.put("isAvailable", item.isAvailable());
        response.put("createdAt", item.getCreatedAt());
        response.put("updatedAt", item.getUpdatedAt());

        // Safe seller access - handles LazyInitializationException
        try {
            if (item.getSeller() != null) {
                Map<String, Object> sellerInfo = new HashMap<>();
                sellerInfo.put("id", item.getSeller().getId());

                // Try to access name safely
                try {
                    sellerInfo.put("name", item.getSeller().getName());
                    sellerInfo.put("email", item.getSeller().getEmail());
                } catch (Exception e) {
                    // If we can't access lazy-loaded data, fetch it manually
                    User seller = userRepository.findById(item.getSeller().getId())
                            .orElse(null);
                    if (seller != null) {
                        sellerInfo.put("name", seller.getName());
                        sellerInfo.put("email", seller.getEmail());
                    } else {
                        sellerInfo.put("name", "Unknown Seller");
                        sellerInfo.put("email", "");
                    }
                }

                sellerInfo.put("storeUrl", "/marketplace/store/" + item.getSeller().getId());
                response.put("seller", sellerInfo);
            }
        } catch (Exception e) {
            log.warn("Could not load seller info for item {}: {}", item.getId(), e.getMessage());
            response.put("seller", Map.of(
                    "id", "unknown",
                    "name", "Unknown Seller",
                    "email", "",
                    "storeUrl", "#"
            ));
        }

        // Safe category access
        try {
            if (item.getCategory() != null) {
                Map<String, Object> categoryInfo = new HashMap<>();
                categoryInfo.put("id", item.getCategory().getId());
                categoryInfo.put("name", item.getCategory().getName());
                response.put("category", categoryInfo);
            }
        } catch (Exception e) {
            log.warn("Could not load category info for item {}: {}", item.getId(), e.getMessage());
            response.put("category", null);
        }

        return response;
    }

    // Request DTO for creating items
    public static class CreateItemRequest {
        private String title;
        private String description;
        private BigDecimal price;
        private BigDecimal originalPrice;
        private Long categoryId;
        private MarketplaceItem.ItemCondition condition;
        private Integer quantity;
        private List<String> images;
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

        public List<String> getImages() { return images; }
        public void setImages(List<String> images) { this.images = images; }

        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }

        public Boolean getIsNegotiable() { return isNegotiable; }
        public void setIsNegotiable(Boolean isNegotiable) { this.isNegotiable = isNegotiable; }
    }
}