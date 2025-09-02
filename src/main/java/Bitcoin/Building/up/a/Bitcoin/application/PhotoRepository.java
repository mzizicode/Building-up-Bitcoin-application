package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {

    // ---------- Existing basic finders ----------
    List<Photo> findByStatus(PhotoStatus status);

    // ADD THESE NEW METHODS TO FIX LAZY LOADING:
    @Query("SELECT p FROM Photo p JOIN FETCH p.user WHERE p.status = :status")
    List<Photo> findByStatusWithUser(@Param("status") PhotoStatus status);

    @Query("SELECT p FROM Photo p JOIN FETCH p.user WHERE p.user.id = :userId")
    List<Photo> findByUser_IdWithUser(@Param("userId") Long userId);

    @Query("SELECT p FROM Photo p JOIN FETCH p.user WHERE p.user.id = :userId AND p.status IN :statuses")
    List<Photo> findByUser_IdAndStatusInWithUser(@Param("userId") Long userId, @Param("statuses") Collection<PhotoStatus> statuses);

    @Query("SELECT p FROM Photo p JOIN FETCH p.user WHERE p.user.id = :userId ORDER BY p.uploadDate DESC")
    Optional<Photo> findFirstByUser_IdOrderByUploadDateDescWithUser(@Param("userId") Long userId);

    // Navigate through relation: Photo.user.id
    List<Photo> findByUser_Id(Long userId);

    // Newest first (useful for dashboards)
    List<Photo> findAllByOrderByUploadDateDesc();

    // Counts
    long countByStatus(PhotoStatus status);
    long countByUser_Id(Long userId);
    long countByIsWinnerTrue();

    // Most recent photo for a user
    Optional<Photo> findFirstByUser_IdOrderByUploadDateDesc(Long userId);

    // ---------- "Active for the draw" helpers ----------
    // Active submissions for a user (e.g., IN_DRAW)
    List<Photo> findByUser_IdAndStatusIn(Long userId, Collection<PhotoStatus> statuses);
    long countByUser_IdAndStatusIn(Long userId, Collection<PhotoStatus> statuses);

    // ---------- Winners ----------
    // Most recent winner system-wide by upload date (kept from your code)
    Optional<Photo> findFirstByIsWinnerTrueOrderByUploadDateDesc();

    // ---------- NEW, safe helpers (used by public endpoints) ----------
    // Fetch by multiple statuses (e.g., IN_DRAW plus winners)
    List<Photo> findByStatusIn(Collection<PhotoStatus> statuses);

    // A capped, sorted list for feeds (adjust 200 if you want more/less)
    List<Photo> findTop200ByStatusInOrderByUploadDateDesc(Collection<PhotoStatus> statuses);

    // If you store the lottery date, this gives the latest winner by draw time
    Optional<Photo> findFirstByIsWinnerTrueOrderByLotteryDateDesc();
}