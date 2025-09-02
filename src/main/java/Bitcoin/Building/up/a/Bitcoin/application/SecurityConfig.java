package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;

import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutHandler;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // === Injected components ===
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint; // your custom entry point
    private final JwtAuthenticationFilter jwtAuthFilter;                   // your JWT filter
    private final UserDetailsServiceImpl userDetailsService;               // your user loader

    // Optional logout handler (no-op by default)
    private final LogoutHandler logoutHandler = (request, response, authentication) -> { };

    // === Beans ===

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF off for stateless APIs
                .csrf(AbstractHttpConfigurer::disable)

                // CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Stateless (JWT) sessions
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Clean 401s via your custom entry point
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthenticationEntryPoint))

                // IMPORTANT: prevent Spring’s AnonymousAuthenticationFilter from setting "anonymousUser"
                .anonymous(a -> a.disable())

                // Authorization rules
                .authorizeHttpRequests(auth -> auth
                        // ---- PUBLIC endpoints (permitAll) ----
                        .requestMatchers(
                                "/api/auth/**",                 // login/register/refresh/etc.
                                "/api/users/register",
                                "/api/users/signin",
                                "/api/users/verify-email",
                                "/api/photos/lottery",          // public: view lottery summary (your choice)
                                "/api/photos/current-winner",   // public: current winner (your choice)
                                "/api/marketplace/public/**",
                                "/api/debug/**",                // remove in production
                                "/api/users/create-test-user",  // remove in production
                                "/actuator/health",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/api-docs/**",
                                "/error",
                                "/static/**",
                                "/public/**"
                        ).permitAll()

                        // ---- PROTECTED: PhotoUploadController endpoints that need auth ----
                        .requestMatchers(
                                "/api/photos/submit",
                                "/api/photos/check-user-submission/**",
                                "/api/photos/user/**",
                                "/api/photos/user-stats",
                                "/api/photos/delete/**",
                                "/api/photos/my-photos",
                                "/api/photos/spin-lottery"
                        ).authenticated()

                        // Wallet
                        .requestMatchers("/api/wallet/**").authenticated()

                        // Marketplace (non-public)
                        .requestMatchers("/api/marketplace/**").authenticated()

                        // User private endpoints
                        .requestMatchers(
                                "/api/users/by-email",
                                "/api/users/profile"
                        ).authenticated()

                        // Notifications
                        .requestMatchers("/api/notifications/**").authenticated()

                        // Orders
                        .requestMatchers("/api/orders/**").authenticated()

                        // Admin
                        .requestMatchers("/actuator/**").hasRole("ADMIN")

                        // Everything else requires auth
                        .anyRequest().authenticated()
                )

                // Use our DAO-based provider
                .authenticationProvider(authenticationProvider())

                // Put JWT filter before UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                // Simple logout that clears the context
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .addLogoutHandler(logoutHandler)
                        .logoutSuccessHandler((request, response, authentication) -> {
                            SecurityContextHolder.clearContext();
                            response.setStatus(HttpStatus.OK.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                            response.getWriter().write("{\"success\":true}");
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allowed origins (adjust for production)
        configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "https://*.vercel.app",
                "https://*.netlify.app",
                "https://your-production-domain.com"
        ));

        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
        ));

        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
