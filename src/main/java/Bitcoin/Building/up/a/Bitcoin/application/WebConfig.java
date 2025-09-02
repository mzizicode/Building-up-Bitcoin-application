package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Only handle specific static resource paths
        // Do NOT add /** handler as it will intercept API calls

        // If you have static resources, handle them explicitly
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");
    }
}