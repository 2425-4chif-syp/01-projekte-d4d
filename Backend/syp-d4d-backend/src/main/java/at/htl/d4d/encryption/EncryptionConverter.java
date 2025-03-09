package at.htl.d4d.encryption;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Converter
public class EncryptionConverter implements AttributeConverter<String, String> {

    // Beispiel-Schlüssel, 32 Byte => AES-256
    // In Produktion nicht fest im Code, sondern z.B. aus Config laden
    private static final String SECRET_KEY = "0123456789abcdef0123456789abcdef";
    // AES-Mode und Padding (demonstrativ, nicht best practice)
    private static final String ALGORITHM = "AES/ECB/PKCS5Padding";

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            SecretKeySpec key = new SecretKeySpec(SECRET_KEY.getBytes("UTF-8"), "AES");
            Cipher c = Cipher.getInstance(ALGORITHM);
            c.init(Cipher.ENCRYPT_MODE, key);
            byte[] encryptedValue = c.doFinal(attribute.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(encryptedValue);
        } catch (Exception e) {
            throw new RuntimeException("Fehler bei der Verschlüsselung", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            SecretKeySpec key = new SecretKeySpec(SECRET_KEY.getBytes("UTF-8"), "AES");
            Cipher c = Cipher.getInstance(ALGORITHM);
            c.init(Cipher.DECRYPT_MODE, key);
            byte[] decodedBytes = Base64.getDecoder().decode(dbData);
            byte[] decryptedValue = c.doFinal(decodedBytes);
            return new String(decryptedValue, "UTF-8");
        } catch (Exception e) {
            throw new RuntimeException("Fehler bei der Entschlüsselung", e);
        }
    }
}
