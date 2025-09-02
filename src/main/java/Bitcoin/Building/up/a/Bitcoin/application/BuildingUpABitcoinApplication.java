package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@ComponentScan(basePackages = "Bitcoin.Building.up.a.Bitcoin.application")
@EnableJpaRepositories(basePackages = "Bitcoin.Building.up.a.Bitcoin.application")
public class BuildingUpABitcoinApplication {

	public static void main(String[] args) {
		try {
			SpringApplication.run(BuildingUpABitcoinApplication.class, args);
			System.out.println("✅ Photo Lottery Application started successfully!");
		} catch (Exception e) {
			System.err.println("❌ Application failed to start: " + e.getMessage());
			e.printStackTrace();
		}
	}
}