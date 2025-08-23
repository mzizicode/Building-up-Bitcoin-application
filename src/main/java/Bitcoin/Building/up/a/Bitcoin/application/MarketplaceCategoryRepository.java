// MarketplaceCategoryRepository.java
package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MarketplaceCategoryRepository extends JpaRepository<MarketplaceCategory, Long> {
    /**
     * Find active categories
     */
    List<MarketplaceCategory> findByIsActiveTrue();

    /**
     * Find root categories (no parent)
     */
    List<MarketplaceCategory> findByParentIsNullAndIsActiveTrue();

    /**
     * Find child categories
     */
    List<MarketplaceCategory> findByParentIdAndIsActiveTrue(Long parentId);

    /**
     * Find category by name
     */
    Optional<MarketplaceCategory> findByNameIgnoreCase(String name);

    /**
     * Find categories ordered by display order
     */
    List<MarketplaceCategory> findByIsActiveTrueOrderByDisplayOrderAsc();
}

/**
 * Repository for MarketplaceOrder operations
 */
