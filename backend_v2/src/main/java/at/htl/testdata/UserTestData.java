package at.htl.testdata;

import at.htl.entity.User;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@ApplicationScoped
public class UserTestData {
    @Inject
    UserRepository userRepository;

    @Inject
    EntityManager entityManager;

    private static final String[] FIRST_NAMES =
            {"Felix", "Robert", "Anna", "Lena", "Tom", "Max"};

    private static final String[] LAST_NAME_PART1 =

            {"Holz", "Land", "Stein", "Berg", "Fluss", "Wald"};
    private static final String[] LAST_NAME_PART2 =

            {"mann", "knecht", "schmidt", "bauer", "huber", "son"};

    public void generateUserTestData() {
        entityManager.createNativeQuery("DELETE FROM d4d_user").executeUpdate();
        List<User> users = IntStream.range(0, 216)
                .mapToObj(i -> new User(generateUserName(i)))
                .collect(Collectors.toList());

        for (User user : users) {
            userRepository.persist(user);
        }
    }

    private String generateUserName(
            int index
    ) {
        return FIRST_NAMES[index % 6] + " " + LAST_NAME_PART1[(index / 6) % 6]
                + LAST_NAME_PART2[(index / 36) % 6];
    }
}