package at.htl.testdata;

import at.htl.entity.*;
import at.htl.repository.ChatEntryRepository;
import at.htl.repository.ServiceRepository;
import at.htl.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.sql.Timestamp;
import java.util.*;

@ApplicationScoped
public class ChatEntryTestData {
    @Inject
    ChatEntryRepository chatEntryRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ServiceRepository serviceRepository;

    @Inject
    EntityManager entityManager;

    public void generateChatEntryTestData() {
        entityManager.createNativeQuery("DELETE FROM d4d_chat_entry").executeUpdate();
        List<ChatEntry> chatEntryList = new ArrayList<>();

        List<User> allUsers = userRepository.listAll();
        if (allUsers.isEmpty()) {
            System.out.println("[WARN] No users found to generate chat entries!");
            return;
        }

        User adminUser = userRepository.find("name", "Admin").firstResult();
        if (adminUser == null) {
            adminUser = new User("Admin");
            userRepository.persist(adminUser);
        }

        User firstUser = allUsers.get(0);
        ChatEntry adminChat = new ChatEntry(
                adminUser,
                firstUser,
                "Hallo, ich bin der Admin. Wie kann ich dir helfen?",
                new Timestamp(System.currentTimeMillis())
        );
        chatEntryList.add(adminChat);

        List<Service> allServices = serviceRepository.listAll();
        System.out.println("[DEBUG] Found " + allServices.size() + " Service entries in DB.");

        Random random = new Random();
        String[] chatMessages = {
                "Hallo, ich interessiere mich für deine Hilfe.",
                "Können wir einen Termin für die Nachhilfe vereinbaren?",
                "Ich hätte diese Woche Zeit für eine Lerneinheit.",
                "Wie lange würde eine Lernsession dauern?",
                "Kannst du mir mit diesem Thema helfen?",
                "Hast du Erfahrung mit diesem Fachgebiet?",
                "Was ist dein Stundensatz?",
                "Ich brauche dringend Hilfe für eine Prüfung."
        };

        String[] responseMessages = {
                "Klar, ich kann dir gerne helfen!",
                "Ja, ich habe Zeit diese Woche.",
                "Ich schlage vor, wir treffen uns in der Bibliothek.",
                "Eine Session dauert normalerweise 90 Minuten.",
                "Ich bin in diesem Thema sehr gut.",
                "Wir können uns gerne morgen treffen.",
                "Ja, ich habe bereits 3 Semester Erfahrung darin.",
                "Sicher, schick mir einfach deine Fragen vorab."
        };

        for (Service service : allServices) {
            if (random.nextDouble() < 0.5) {
                Market providerMarket = service.getMarketProvider();
                Market consumerMarket = service.getMarketClient();

                User provider = providerMarket.getUser();
                User consumer = consumerMarket.getUser();
                ServiceType serviceType = providerMarket.getServiceType();

                long currentTime = System.currentTimeMillis();

                String initialMessage = chatMessages[random.nextInt(chatMessages.length)] +
                        " (Fach: " + serviceType.getName() + ")";
                ChatEntry initialChat = new ChatEntry(
                        consumer,
                        provider,
                        initialMessage,
                        new Timestamp(currentTime)
                );
                chatEntryList.add(initialChat);

                String responseMessage = responseMessages[random.nextInt(responseMessages.length)];
                ChatEntry responseChat = new ChatEntry(
                        provider,
                        consumer,
                        responseMessage,
                        new Timestamp(currentTime + 60000)
                );
                chatEntryList.add(responseChat);

                if (random.nextDouble() < 0.3) {
                    ChatEntry followUpChat = new ChatEntry(
                            consumer,
                            provider,
                            "Super, danke für die schnelle Antwort!",
                            new Timestamp(currentTime + 120000)
                    );
                    chatEntryList.add(followUpChat);
                }
            }
        }

        if (chatEntryList.size() > 315) {
            Collections.shuffle(chatEntryList);
            chatEntryList = chatEntryList.subList(0, 315);
            chatEntryList.sort(Comparator.comparing(ChatEntry::getTime));
        }

        System.out.println("[DEBUG] About to persist " + chatEntryList.size() + " chat entries");

        int count = 0;
        for (ChatEntry entry : chatEntryList) {
            chatEntryRepository.persist(entry);
            count++;
        }
    }
}
