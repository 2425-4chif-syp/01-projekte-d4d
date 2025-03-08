package at.htl.d4d.tests;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.MessageRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.control.ServiceTypesRepository; // <-- NEU
import at.htl.d4d.entity.Chat;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.Message;
import at.htl.d4d.entity.User;
import at.htl.d4d.entity.ServiceType; // <-- NEU
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@ApplicationScoped
public class ChatTestData {

    @Inject
    ChatRepository chatRepository;

    @Inject
    MarketRepository marketRepository;

    @Inject
    MessageRepository messageRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    ServiceTypesRepository serviceTypesRepository; // <-- Neu, um Fach (ServiceType) zu holen

    private static final int MAX_CHAT_ENTRIES = 315;

    @Transactional
    public void generateChatTestData() {
        System.out.println("[INFO] Starting generation of chat test data...");

        // 1) Alle Markets laden
        List<Market> allMarkets = marketRepository.getAllMarkets();
        System.out.println("[DEBUG] Found " + allMarkets.size() + " Market entries in DB.");

        List<Chat> chatList = new ArrayList<>();
        Random random = new Random();

        // 2) Für ~50% der Markets einen Chat anlegen
        for (Market market : allMarkets) {
            if (random.nextDouble() < 0.5) {
                // Hole User
                User user = userRepository.findById(market.user_ID);
                String userName = (user != null) ? user.name : "UnknownUser";

                // Hole Service/Fach
                ServiceType st = serviceTypesRepository.findById(market.serviceType_ID);
                String fachName = (st != null) ? st.getTypeOfService() : "UnknownService";

                // Chatname => "Chat with <User> for <Fach>"
                String chatName = "Chat with " + userName + " for " + fachName;

                Chat chat = new Chat();
                chat.chatName = chatName;

                chatList.add(chat);
            }
        }

        // 3) Beschränke Anzahl
        if (chatList.size() > MAX_CHAT_ENTRIES) {
            chatList = chatList.subList(0, MAX_CHAT_ENTRIES);
        }

        System.out.println("[DEBUG] About to persist " + chatList.size() + " chat entries");

        // 4) Chats persistieren
        int count = 0;
        for (Chat chat : chatList) {
            chatRepository.persist(chat);
            System.out.println("[DEBUG] Persisted chat entry " + count + ": " + chat.chatName);
            count++;
        }

        // 5) Für ~50% dieser Chats Willkommensnachricht anlegen
        int welcomeCount = 0;
        for (Chat chat : chatList) {
            if (random.nextDouble() < 0.5) {
                Message welcome = new Message(chat.id, "System", "Willkommen im Chat!", null);
                messageRepository.persist(welcome);
                System.out.println("[DEBUG] Persisted WELCOME message for chat ID " + chat.id);
                welcomeCount++;
            }
        }

        System.out.println("[INFO] Finished generating chats. Total created: " + chatList.size());
        System.out.println("[INFO] Created " + welcomeCount + " welcome messages in those chats.");
    }
}
