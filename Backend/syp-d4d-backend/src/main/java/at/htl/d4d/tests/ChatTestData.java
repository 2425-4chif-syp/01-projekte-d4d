package at.htl.d4d.tests;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.MessageRepository; // <-- Neu einbinden
import at.htl.d4d.entity.Chat;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.Message;            // <-- Neu einbinden
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

@ApplicationScoped
public class ChatTestData {

    @Inject
    ChatRepository chatRepository;

    @Inject
    MarketRepository marketRepository;

    @Inject
    MessageRepository messageRepository; // <-- Neu, damit wir Nachrichten persistieren können

    // Analog zu deinem MarketTestData: Obergrenze für die Anzahl der Chat-Einträge
    private static final int MAX_CHAT_ENTRIES = 315; // z.B. 300 + 5% Toleranz

    @Transactional
    public void generateChatTestData() {
        System.out.println("[INFO] Starting generation of standard chat test data...");

        // Hole alle Market-Einträge aus der DB
        List<Market> allMarkets = marketRepository.getAllMarkets();
        System.out.println("[DEBUG] Found " + allMarkets.size() + " Market entries in DB.");

        // Liste für alle neu anzulegenden Chats
        List<Chat> chatList = new ArrayList<>();
        Random random = new Random();

        // Erzeuge für ca. 50% der Markets einen Chat
        for (Market market : allMarkets) {
            if (random.nextDouble() < 0.5) {
                String chatName = "StandardChat for Market " + market.id;
                Chat chat = new Chat(chatName);
                chatList.add(chat);
            }
        }

        // Beschränke die Gesamtzahl der Chats
        if (chatList.size() > MAX_CHAT_ENTRIES) {
            chatList = chatList.subList(0, MAX_CHAT_ENTRIES);
        }

        System.out.println("[DEBUG] About to persist " + chatList.size() + " chat entries");

        // Liste möglicher Willkommens-Nachrichten
        List<String> greetings = Arrays.asList(
                "Hallo! Starte den Chat...",
                "Willkommen! Lass uns loslegen.",
                "Hi! Schön, dass du hier bist.",
                "Moin! Hier kann es losgehen."
        );

        // Alle Chats persistieren
        int count = 0;
        for (Chat chat : chatList) {
            chatRepository.persist(chat);

            // In 50% der Fälle zusätzlich eine Nachricht erstellen
            if (random.nextDouble() < 0.5) {
                String randomGreeting = greetings.get(random.nextInt(greetings.size()));
                // Beispiel: userName="System", message=Zufalls-Begrüßung, image=null
                Message newMessage = new Message(chat.id, "System", randomGreeting, null);
                messageRepository.persist(newMessage);
                System.out.println("[DEBUG] Created initial message in chat " + chat.id + ": " + randomGreeting);
            }

            System.out.println("[DEBUG] Persisted chat entry " + count + ": " + chat.chatName);
            count++;
        }

        System.out.println("[INFO] Finished generating chats. Total created: " + chatList.size());
    }
}
