package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EscrowDealRepository extends JpaRepository<EscrowDeal, Long> {

    // Find by on-chain deal id
    Optional<EscrowDeal> findByDealId(Long dealId);

    // Optional: all deals for a marketplace order
    List<EscrowDeal> findByOrderId(Long orderId);
}
