package Bitcoin.Building.up.a.Bitcoin.application;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    /**
     * Base64-encoded secret key (HS256). Example:
     * jwt.secret=VGhpc0lzQVVVUl9MT05HX1NFQ1JFVF9TSE9VTERCRV9CQVNFMjU2IQ==
     */
    @Value("${jwt.secret}")
    private String secretKey;

    /**
     * Token lifetime in milliseconds (e.g., 3600000 for 1 hour)
     */
    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // ---------------------------------------------------------------------
    // Extraction helpers (keep all three to satisfy any caller in your code)
    // ---------------------------------------------------------------------

    /** Preferred generic accessor: reads the JWT "sub" claim. */
    public String extractSubject(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /** Compatibility alias: many codebases call this. */
    public String extractUsername(String token) {
        return extractSubject(token);
    }

    /** Compatibility alias: your current code calls this. */
    public String extractEmail(String token) {
        return extractSubject(token);
    }

    // ---------------------------------
    // Token generation (optional use)
    // ---------------------------------

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    private String buildToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            long expiration
    ) {
        // NOTE: using the new jjwt 0.11+ builder API: set signing key via .signWith(Key)
        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey()) // HS256 inferred from key size
                .compact();
    }

    // -------------------------
    // Validation
    // -------------------------

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String subject = extractSubject(token);
            return subject != null
                    && subject.equals(userDetails.getUsername())
                    && !isTokenExpired(token);
        } catch (Exception e) {
            log.warn("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        Date exp = extractExpiration(token);
        return exp != null && exp.before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // -------------------------
    // Claim utilities
    // -------------------------

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSignInKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired: {}", e.getMessage());
            throw e;
        } catch (UnsupportedJwtException e) {
            log.warn("JWT token unsupported: {}", e.getMessage());
            throw e;
        } catch (MalformedJwtException e) {
            log.warn("JWT token malformed: {}", e.getMessage());
            throw e;
        } catch (SecurityException e) {
            log.warn("JWT signature invalid: {}", e.getMessage());
            throw e;
        } catch (IllegalArgumentException e) {
            log.warn("JWT token compact or handler invalid: {}", e.getMessage());
            throw e;
        }
    }

    // -------------------------
    // Key
    // -------------------------

    private Key getSignInKey() {
        // secretKey must be Base64-encoded
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
