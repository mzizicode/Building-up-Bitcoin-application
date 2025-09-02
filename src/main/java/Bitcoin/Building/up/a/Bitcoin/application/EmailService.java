package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@photolottery.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    @Value("${app.name:Photo Lottery}")
    private String appName;

    /**
     * Send welcome email to new user with BACKEND verification URL
     */
    @Async
    public CompletableFuture<Boolean> sendWelcomeEmail(User user, String verificationToken) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("Welcome to " + appName + "! Please verify your email");

            // FIXED: Use backend URL for direct verification
            String verificationUrl = backendUrl + "/api/auth/verify-email?token=" + verificationToken;
            String htmlContent = buildWelcomeEmailHtml(user.getName(), verificationUrl);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Welcome email sent to {} with verification URL: {}", user.getEmail(), verificationUrl);

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {
            log.error("Failed to send welcome email to {}: {}", user.getEmail(), e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }

    /**
     * Send email verification email with BACKEND verification URL
     */
    @Async
    public CompletableFuture<Boolean> sendVerificationEmail(String email, String userName, String verificationToken) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Please verify your email - " + appName);

            // FIXED: Use backend URL for direct verification
            String verificationUrl = backendUrl + "/api/auth/verify-email?token=" + verificationToken;
            String htmlContent = buildVerificationEmailHtml(userName, verificationUrl);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Verification email sent to {} with verification URL: {}", email, verificationUrl);

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", email, e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }

    // Keep all other methods the same...
    @Async
    public CompletableFuture<Boolean> sendNotificationEmail(User user, String title, String message, String actionUrl) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject(title);

            String htmlContent = buildNotificationEmailHtml(user.getName(), title, message, actionUrl);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Notification email sent to {}: {}", user.getEmail(), title);

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {
            log.error("Failed to send notification email to {}: {}", user.getEmail(), e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public CompletableFuture<Boolean> sendPasswordResetEmail(User user, String resetToken) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("Password Reset Request - " + appName);

            String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;
            String htmlContent = buildPasswordResetEmailHtml(user.getName(), resetUrl);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Password reset email sent to {}", user.getEmail());

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", user.getEmail(), e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public CompletableFuture<Boolean> sendLotteryWinnerEmail(User winner, Photo winningPhoto) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(winner.getEmail());
            helper.setSubject("🎉 Congratulations! You Won the Photo Lottery!");

            String htmlContent = buildLotteryWinnerEmailHtml(winner.getName(), winningPhoto);
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Lottery winner email sent to {}", winner.getEmail());

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {
            log.error("Failed to send lottery winner email to {}: {}", winner.getEmail(), e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }

    @Async
    public CompletableFuture<Boolean> sendSimpleEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);

            mailSender.send(message);
            log.info("Simple email sent to {}: {}", to, subject);

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {
            log.error("Failed to send simple email to {}: {}", to, e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }

    // HTML Email Templates - Updated with success redirect
    private String buildWelcomeEmailHtml(String userName, String verificationUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to %s!</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 Welcome to %s!</h1>
                    <p>Your Photo Lottery Adventure Begins Now</p>
                </div>
                <div class="content">
                    <p>Hi %s,</p>
                    <p>Welcome to the exciting world of Photo Lottery! We're thrilled to have you join our community of photography enthusiasts.</p>
                    
                    <div class="features">
                        <h3>What you can do:</h3>
                        <ul>
                            <li>📸 Upload amazing photos to participate in 24-hour lottery draws</li>
                            <li>🎰 Win exciting prizes when your photos are selected</li>
                            <li>💰 Earn coins for various activities</li>
                            <li>🛒 Use coins in our marketplace</li>
                            <li>🔔 Get notifications about draws and results</li>
                        </ul>
                    </div>
                    
                    <p><strong>To get started, please verify your email address by clicking the button below:</strong></p>
                    <p style="text-align: center;">
                        <a href="%s" class="button">✅ Verify Email Address</a>
                    </p>
                    
                    <p><em>Once verified, you'll receive 100 welcome coins to get you started!</em></p>
                    
                    <p>Happy shooting!</p>
                    <p>The %s Team</p>
                </div>
                <div class="footer">
                    <p>If you have any questions, feel free to contact our support team.</p>
                </div>
            </body>
            </html>
            """, appName, appName, userName, verificationUrl, appName);
    }

    private String buildVerificationEmailHtml(String userName, String verificationUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Your Email - %s</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📧 Verify Your Email</h1>
                    <p>%s</p>
                </div>
                <div class="content">
                    <p>Hi %s,</p>
                    <p>Thank you for registering with %s! To complete your registration and secure your account, please verify your email address.</p>
                    
                    <p style="text-align: center;">
                        <a href="%s" class="button">✅ Verify Email Address</a>
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This verification link will expire in 24 hours</li>
                            <li>If you didn't create an account with us, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">%s</p>
                    
                    <p>Welcome to our community!</p>
                    <p>The %s Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated email from %s. Please do not reply.</p>
                </div>
            </body>
            </html>
            """, appName, appName, userName, appName, verificationUrl, verificationUrl, appName, appName);
    }

    // Keep other HTML template methods unchanged...
    private String buildNotificationEmailHtml(String userName, String title, String message, String actionUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>%s</h1>
                    <h2>%s</h2>
                </div>
                <div class="content">
                    <p>Hi %s,</p>
                    <p>%s</p>
                    %s
                    <p>Thank you for being part of our community!</p>
                    <p>Best regards,<br>The %s Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from %s. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
            """,
                title, appName, title, userName, message,
                actionUrl != null ? String.format("<p><a href=\"%s\" class=\"button\">View Details</a></p>", actionUrl) : "",
                appName, appName);
    }

    private String buildPasswordResetEmailHtml(String userName, String resetUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset - %s</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #dc3545 0%%, #6c757d 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🔒 Password Reset Request</h1>
                    <p>%s</p>
                </div>
                <div class="content">
                    <p>Hi %s,</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <p style="text-align: center;">
                        <a href="%s" class="button">Reset Password</a>
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>This link will expire in 1 hour for security reasons</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">%s</p>
                    
                    <p>Stay secure!</p>
                    <p>The %s Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated security email from %s.</p>
                </div>
            </body>
            </html>
            """, appName, appName, userName, resetUrl, resetUrl, appName, appName);
    }

    private String buildLotteryWinnerEmailHtml(String winnerName, Photo winningPhoto) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>🎉 You Won the Lottery!</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ffd700 0%%, #ff6b6b 100%%); color: #333; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .winner-photo { text-align: center; margin: 20px 0; }
                    .winner-photo img { max-width: 300px; height: auto; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
                    .button { display: inline-block; background: #ffd700; color: #333; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="celebration">🎉🎊🏆🎊🎉</div>
                    <h1>CONGRATULATIONS!</h1>
                    <h2>You Won the Photo Lottery!</h2>
                </div>
                <div class="content">
                    <p>Dear %s,</p>
                    
                    <p><strong>🎊 AMAZING NEWS! 🎊</strong></p>
                    
                    <p>Your photo has been selected as the winner in our latest lottery draw! Your creativity and talent have paid off.</p>
                    
                    <div class="winner-photo">
                        <h3>Your Winning Photo:</h3>
                        <img src="%s" alt="Winning Photo" />
                        <p><em>"%s"</em></p>
                    </div>
                    
                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>🏆 Your photo is now featured as the current winner</li>
                        <li>💰 You've earned bonus coins for your victory</li>
                        <li>📸 Keep uploading more photos for future draws</li>
                        <li>🎯 Share your victory with friends!</li>
                    </ul>
                    
                    <p style="text-align: center;">
                        <a href="%s" class="button">View Your Victory</a>
                    </p>
                    
                    <p>Thank you for being part of our amazing community. We can't wait to see your next submission!</p>
                    
                    <p>Celebrate and keep shooting!</p>
                    <p>The %s Team 📸✨</p>
                </div>
                <div class="footer">
                    <p>You're receiving this because you won our photo lottery. Congratulations again!</p>
                </div>
            </body>
            </html>
            """, winnerName, winningPhoto.getS3Url(), winningPhoto.getDescription(),
                frontendUrl + "/lottery", appName);
    }
}
