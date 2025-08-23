package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {

    // Find all photos by user ID
    List<Photo> findByUserId(Long userId);

    // Find all photos by status
    List<Photo> findByStatus(Photo.PhotoStatus status);

    // Find photos by user ID and status
    List<Photo> findByUserIdAndStatus(Long userId, Photo.PhotoStatus status);

    // Find all photos ordered by upload date (newest first)
    List<Photo> findAllByOrderByUploadDateDesc();

    // Count photos by status
    Long countByStatus(Photo.PhotoStatus status);

    // Count photos by user
    Long countByUserId(Long userId);
}