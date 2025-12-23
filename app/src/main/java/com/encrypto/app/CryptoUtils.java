package com.encrypto.app;

import android.util.Base64;
import org.bouncycastle.crypto.generators.Argon2BytesGenerator;
import org.bouncycastle.crypto.params.Argon2Parameters;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class CryptoUtils {

    private static final int GCM_IV_LENGTH = 12;         // 96 bits, recommended for GCM
    private static final int GCM_TAG_LENGTH = 128;       // 128-bit authentication tag
    private static final int SALT_LENGTH = 16;           // 128 bits
    private static final int KEY_LENGTH = 32;            // 256 bits for AES-256

    // Argon2id parameters – tuned for modern mobile devices
    private static final int ARGON2_ITERATIONS = 4;
    private static final int ARGON2_MEMORY = 64 * 1024;   // 64 MiB (in KB)
    private static final int ARGON2_PARALLELISM = 2;

    private static final byte CURRENT_VERSION = 0x02;    // Version 2 = Argon2id + AES-GCM

    private static final SecureRandom secureRandom = new SecureRandom();

    /**
     * Encrypts plaintext using password.
     * Output: Base64 string of [version(1) | salt(16) | nonce(12) | ciphertext | tag(16)]
     */
    public static String encrypt(String plaintext, String password) throws Exception {
        if (plaintext == null || password == null) {
            throw new IllegalArgumentException("Plaintext and password must not be null");
        }

        byte[] salt = new byte[SALT_LENGTH];
        secureRandom.nextBytes(salt);

        // Derive key using Argon2id via Bouncy Castle
        byte[] keyBytes = deriveKey(password, salt);

        SecretKey key = new SecretKeySpec(keyBytes, "AES");

        // Generate nonce
        byte[] nonce = new byte[GCM_IV_LENGTH];
        secureRandom.nextBytes(nonce);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, nonce);
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);

        byte[] ciphertextAndTag = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        // Assemble final byte array
        // Structure: [Version(1) | Salt(16) | Nonce(12) | CiphertextAndTag(N)]
        // Note: Java's AES/GCM/NoPadding automatically appends the tag to the end of ciphertext
        byte[] result = new byte[1 + SALT_LENGTH + GCM_IV_LENGTH + ciphertextAndTag.length];
        
        int pos = 0;
        result[pos++] = CURRENT_VERSION;
        
        System.arraycopy(salt, 0, result, pos, SALT_LENGTH);
        pos += SALT_LENGTH;
        
        System.arraycopy(nonce, 0, result, pos, GCM_IV_LENGTH);
        pos += GCM_IV_LENGTH;
        
        System.arraycopy(ciphertextAndTag, 0, result, pos, ciphertextAndTag.length);

        return Base64.encodeToString(result, Base64.DEFAULT);
    }

    /**
     * Decrypts a Base64 string produced by encrypt().
     */
    public static String decrypt(String encryptedBase64, String password) throws Exception {
        if (encryptedBase64 == null || password == null) {
            throw new IllegalArgumentException("Input and password must not be null");
        }

        byte[] data = Base64.decode(encryptedBase64, Base64.DEFAULT);

        if (data.length < 1 + SALT_LENGTH + GCM_IV_LENGTH + 16) {
            throw new IllegalArgumentException("Invalid encrypted data length");
        }

        int pos = 0;
        byte version = data[pos++];
        
        // Basic version check - handling legacy could be added here if needed
        if (version != CURRENT_VERSION) {
            // For now, fail on version mismatch to enforce new security
            throw new IllegalArgumentException("Unsupported version: " + version);
        }

        byte[] salt = new byte[SALT_LENGTH];
        System.arraycopy(data, pos, salt, 0, SALT_LENGTH);
        pos += SALT_LENGTH;

        byte[] nonce = new byte[GCM_IV_LENGTH];
        System.arraycopy(data, pos, nonce, 0, GCM_IV_LENGTH);
        pos += GCM_IV_LENGTH;

        // The rest is Ciphertext + Tag
        byte[] ciphertextAndTag = new byte[data.length - pos];
        System.arraycopy(data, pos, ciphertextAndTag, 0, ciphertextAndTag.length);

        byte[] keyBytes = deriveKey(password, salt);
        SecretKey key = new SecretKeySpec(keyBytes, "AES");

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, nonce);
        cipher.init(Cipher.DECRYPT_MODE, key, spec);

        byte[] plaintextBytes = cipher.doFinal(ciphertextAndTag);

        return new String(plaintextBytes, StandardCharsets.UTF_8);
    }

    // Helper using Bouncy Castle's Argon2
    private static byte[] deriveKey(String password, byte[] salt) {
        Argon2Parameters.Builder builder = new Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
                .withVersion(Argon2Parameters.ARGON2_VERSION_13)
                .withIterations(ARGON2_ITERATIONS)
                .withMemoryAsKB(ARGON2_MEMORY)
                .withParallelism(ARGON2_PARALLELISM)
                .withSalt(salt);

        Argon2BytesGenerator generator = new Argon2BytesGenerator();
        generator.init(builder.build());

        byte[] result = new byte[KEY_LENGTH];
        generator.generateBytes(password.toCharArray(), result, 0, result.length);
        return result;
    }

    // Generates a hash of the text (Keeping existing function for hashing feature)
    public static String hash(String text, String algorithm) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance(algorithm);
        byte[] encodedhash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(encodedhash);
    }

    private static String bytesToHex(byte[] hash) {
        StringBuilder hexString = new StringBuilder(2 * hash.length);
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
