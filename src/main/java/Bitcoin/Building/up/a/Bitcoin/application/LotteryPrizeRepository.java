package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface LotteryPrizeRepository extends JpaRepository<LotteryPrize, Long> {

    /**
     * Find all active prizes ordered by display order
     */
    List<LotteryPrize> findByIsActiveTrueOrderByDisplayOrderAsc();

    /**
     * Find all prizes ordered by display order
     */
    List<LotteryPrize> findAllByOrderByDisplayOrderAsc();

    /**
     * Find prize by name
     */
    Optional<LotteryPrize> findByNameIgnoreCase(String name);

    /**
     * Count active prizes
     */
    Long countByIsActiveTrue();

    /**
     * Find prizes by active status
     */
    List<LotteryPrize> findByIsActive(Boolean isActive);

    /**
     * Get maximum display order
     */
    @Query("SELECT COALESCE(MAX(p.displayOrder), 0) FROM LotteryPrize p")
    Integer findMaxDisplayOrder();

    /**
     * Find prizes with AI descriptions
     */
    @Query("SELECT p FROM LotteryPrize p WHERE p.aiDescription IS NOT NULL AND p.aiDescription != ''")
    List<LotteryPrize> findPrizesWithAiDescriptions();

    /**
     * Find prizes without AI descriptions
     */
    @Query("SELECT p FROM LotteryPrize p WHERE p.aiDescription IS NULL OR p.aiDescription = ''")
    List<LotteryPrize> findPrizesWithoutAiDescriptions();
}