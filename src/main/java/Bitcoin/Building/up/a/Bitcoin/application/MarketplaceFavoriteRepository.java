// MarketplaceFavoriteRepository.java
package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MarketplaceFavoriteRepository extends JpaRepository<MarketplaceFavorite, Long> {
    Optional<MarketplaceFavorite> findByUserIdAndItemId(Long userId, Long itemId);

    List<MarketplaceFavorite> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT f.item FROM MarketplaceFavorite f WHERE f.user.id = :userId ORDER BY f.createdAt DESC")
    List<MarketplaceItem> findItemsByUserId(@Param("userId") Long userId);

    Long countByItemId(Long itemId);

    void deleteByUserIdAndItemId(Long userId, Long itemId);
}