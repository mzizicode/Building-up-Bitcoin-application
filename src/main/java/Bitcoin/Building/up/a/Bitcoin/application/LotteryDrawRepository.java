package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface LotteryDrawRepository extends JpaRepository<LotteryDraw, Long> {

    // Find the current winner
    Optional<LotteryDraw> findByIsCurrentWinnerTrue();

    // Count wins by winner ID
    @Query("SELECT COUNT(ld) FROM LotteryDraw ld WHERE ld.winner.id = :userId")
    Long countByWinnerId(@Param("userId") Long userId);

    // Update current winner status for all draws
    @Modifying
    @Transactional
    @Query("UPDATE LotteryDraw ld SET ld.isCurrentWinner = :status WHERE ld.isCurrentWinner = true")
    void updateCurrentWinnerStatus(@Param("status") boolean status);

    // Find recent draws ordered by date
    @Query("SELECT ld FROM LotteryDraw ld ORDER BY ld.drawDate DESC")
    List<LotteryDraw> findRecentDraws();

    // Get total participants all time
    @Query("SELECT SUM(ld.totalParticipants) FROM LotteryDraw ld")
    Long getTotalParticipantsAllTime();

    // Get average participants per draw
    @Query("SELECT AVG(ld.totalParticipants) FROM LotteryDraw ld")
    Double getAverageParticipantsPerDraw();

    // Find draws by winner
    List<LotteryDraw> findByWinner(User winner);

    // Find draws by prize
    List<LotteryDraw> findByPrize(LotteryPrize prize);
}