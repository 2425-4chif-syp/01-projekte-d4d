package at.htl.d4d.tests;

import at.htl.d4d.control.UserRepository;
import at.htl.d4d.entity.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@ApplicationScoped
public class UserTestData {

    @Inject
    UserRepository UserRepository;
    
    private static final String[] FIRST_NAMES = {"Felix", "Robert", "Anna", "Lena", "Tom", "Max"};
    private static final String[] LAST_NAME_PART1 = {"Holz", "Land", "Stein", "Berg", "Fluss", "Wald"};
    private static final String[] LAST_NAME_PART2 = {"mann", "knecht", "schmidt", "bauer", "huber", "son"};

    @Transactional
    public void generateUserTestData() {
        System.out.println("[INFO] Starte Generierung der Benutzer-Testdaten...");
        
        // Generiere exakt 216 Benutzer
        List<User> users = IntStream.range(0, 216)
                .mapToObj(i -> new User(generateUserName(i)))
                .collect(Collectors.toList());
        for (User user : users) {
            UserRepository.persist(user);
        }
        
        User.flush();
        System.out.println("[INFO] Benutzer-Testdaten erfolgreich generiert.");
    }

    private String generateUserName(int index) {
        return FIRST_NAMES[index % 6] + " " + LAST_NAME_PART1[(index / 6) % 6] + LAST_NAME_PART2[(index / 36) % 6];
    }
}