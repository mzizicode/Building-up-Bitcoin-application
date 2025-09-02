package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import jakarta.annotation.PostConstruct;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

@Slf4j
@Configuration
@EnableTransactionManagement  // Enable transaction management
// REMOVED @EnableJpaRepositories - let Spring Boot auto-configuration handle it
public class DatabaseConfig {

    @Autowired
    private DataSource dataSource;

    @PostConstruct
    public void testDatabaseConnection() {
        try {
            log.info("Testing database connection...");

            try (Connection connection = dataSource.getConnection()) {
                if (connection != null && !connection.isClosed()) {
                    log.info("✅ Database connection successful!");
                    log.info("Database URL: {}", connection.getMetaData().getURL());
                    log.info("Database Product: {}", connection.getMetaData().getDatabaseProductName());
                    log.info("Transaction Management: Enabled");
                } else {
                    log.error("❌ Database connection is null or closed");
                }
            }

        } catch (SQLException e) {
            log.error("❌ Database connection failed: {}", e.getMessage());
            log.error("This will cause NullPointerException in controllers!");
            log.warn("Application will continue but database operations will fail");
        }
    }
}