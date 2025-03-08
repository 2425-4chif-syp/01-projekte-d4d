package at.htl.d4d.tests;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.MessageRepository;  // <-- Neu
import at.htl.d4d.entity.Chat;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.Message;             // <-- Neu
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
    MessageRepository messageRepository; // <-- Neu, damit wir Nachrichten anlegen können

    private static final int MAX_CHAT_ENTRIES = 315; // z.B. 300 + 5% Toleranz

    @Transactional
    public void generateChatTestData() {
        System.out.println("[INFO] Starting generation of standard chat test data...");

        // 1) Hole alle Market-Einträge
        List<Market> allMarkets = marketRepository.getAllMarkets();
        System.out.println("[DEBUG] Found " + allMarkets.size() + " Market entries in DB.");

        // 2) Lege Liste für Chats an
        List<Chat> chatList = new ArrayList<>();
        Random random = new Random();

        // 3) Erzeuge für ~50% der Markets einen Chat
        for (Market market : allMarkets) {
            if (random.nextDouble() < 0.5) {
                String chatName = "StandardChat for Market " + market.id;
                Chat chat = new Chat();
                chat.chatName = chatName;
                chatList.add(chat);
            }
        }

        // 4) Beschränke Gesamtzahl
        if (chatList.size() > MAX_CHAT_ENTRIES) {
            chatList = chatList.subList(0, MAX_CHAT_ENTRIES);
        }

        System.out.println("[DEBUG] About to persist " + chatList.size() + " chat entries");

        // 5) Chats persistieren
        int count = 0;
        for (Chat chat : chatList) {
            chatRepository.persist(chat);
            System.out.println("[DEBUG] Persisted chat entry " + count + ": " + chat.chatName);
            count++;
        }

        // 6) Für ~50% dieser neu angelegten Chats eine Willkommensnachricht anlegen
        int welcomeCount = 0;
        for (Chat chat : chatList) {
            if (random.nextDouble() < 0.5) {
                // Erzeuge eine "Willkommen im Chat!"-Nachricht
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
