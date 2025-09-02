package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByVerificationToken(String verificationToken);

    Optional<User> findByResetToken(String resetToken);

    // Direct update query for email verification - this bypasses Hibernate cache
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.emailVerified = true, u.verificationToken = null, u.verificationTokenExpiry = null WHERE u.id = :userId")
    int verifyUserEmail(@Param("userId") Long userId);

    // Alternative: Native SQL query if JPQL doesn't work
    @Modifying
    @Transactional
    @Query(value = "UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL WHERE id = :userId", nativeQuery = true)
    int verifyUserEmailNative(@Param("userId") Long userId);
}