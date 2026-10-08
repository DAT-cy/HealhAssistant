package health_assistant.utils;

import java.security.SecureRandom;

public class GenerateOTP {
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final int OTP_LENGTH = 6;
    private static final String DIGITS = "0123456789";
    private static final String CHARACTERS_PW = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>";
    private static final int PW_LENGTH = 10;

    public static String generateOTP() {
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder(OTP_LENGTH);

        for (int i = 0; i < 2; i++) {
            int index = random.nextInt(DIGITS.length());
            otp.append(DIGITS.charAt(index));
        }

        for (int i = 2; i < OTP_LENGTH; i++) {
            int index = random.nextInt(CHARACTERS.length());
            otp.append(CHARACTERS.charAt(index));
        }

        for (int i = otp.length() - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = otp.charAt(i);
            otp.setCharAt(i, otp.charAt(j));
            otp.setCharAt(j, temp);
        }

        return otp.toString().toUpperCase();
    }

    public static String generatePassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder(PW_LENGTH);

        for (int i = 0; i < PW_LENGTH; i++) {
            int index = random.nextInt(CHARACTERS_PW.length());
            otp.append(CHARACTERS_PW.charAt(index));
        }

        return otp.toString();
    }
}
