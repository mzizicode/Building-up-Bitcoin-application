package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;                 // parses/validates JWTs
    private final UserDetailsService userDetailsService; // loads users by username/email

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // If there's no Bearer token, just continue. Protected routes will 401 via SecurityConfig.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        String subject = null;

        // Try to extract subject in a tolerant way (support either extractUsername or extractEmail)
        try {
            try {
                subject = jwtService.extractUsername(jwt); // common name
            } catch (Throwable ignored) {
                // Fallback to extractEmail if your JwtService exposes that instead
                try {
                    subject = jwtService.extractEmail(jwt);
                } catch (Throwable ex2) {
                    log.warn("JWT subject extraction failed: {}", ex2.getMessage());
                }
            }
        } catch (Exception ex) {
            log.warn("JWT parsing failed: {}", ex.getMessage());
        }

        // Only attempt authentication if we got a subject and the context is not already set
        if (subject != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(subject);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("JWT authenticated user: {}", subject);
                } else {
                    log.warn("Invalid JWT for subject: {}", subject);
                }

            } catch (Exception ex) {
                log.warn("User lookup or token validation failed for {}: {}", subject, ex.getMessage());
                // ensure no stale auth remains
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
