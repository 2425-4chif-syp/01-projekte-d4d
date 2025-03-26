package at.htl.d4d.tests;

import at.htl.d4d.control.ChatRepository;
import at.htl.d4d.control.MarketRepository;
import at.htl.d4d.control.UserRepository;
import at.htl.d4d.control.ServiceTypesRepository;
import at.htl.d4d.entity.Market;
import at.htl.d4d.entity.User;
import at.htl.d4d.entity.ServiceType;
import at.htl.d4d.entity.ChatEntry;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.sql.Timestamp;
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
    UserRepository userRepository;

    @Inject
    ServiceTypesRepository serviceTypesRepository;

    private static final int MAX_CHAT_ENTRIES = 315;

    @Transactional
    public void generateChatTestData() {
        System.out.println("[INFO] Starting generation of chat test data...");

        List<ChatEntry> chatEntryList = new ArrayList<>();

        // Erzeuge einen Admin-Chat: Admin (ID 0) sendet eine Nachricht an den aktuell angemeldeten User (ID 1)
        ChatEntry adminChat = new ChatEntry();
        adminChat.setSender_ID(0L); // 0 repräsentiert den Admin bzw. das System
        adminChat.setReceiver_ID(1L); // Aktueller User (hier hartkodiert als 1)
        adminChat.setMessage("Hallo, ich bin der Admin. Wie kann ich dir helfen?");
        adminChat.setTime(new Timestamp(System.currentTimeMillis()));
        chatEntryList.add(adminChat);

        // 1) Alle Market-Einträge laden
        List<Market> allMarkets = marketRepository.getAllMarkets();
        System.out.println("[DEBUG] Found " + allMarkets.size() + " Market entries in DB.");

        Random random = new Random();

        // 2) Für ca. 50% der Market-Einträge einen ChatEntry anlegen (als Willkommensnachricht)
        for (Market market : allMarkets) {
            if (random.nextDouble() < 0.5) {
                // Zugehörigen User laden
                User user = userRepository.findById(market.user_ID);
                String userName = (user != null) ? user.name : "UnknownUser";

                // Zugehöriges Fach (ServiceType) laden
                ServiceType st = serviceTypesRepository.findById(market.serviceType_ID);
                String fachName = (st != null) ? st.getTypeOfService() : "UnknownService";

                // Erstelle eine Chat-Nachricht vom System an den User
                ChatEntry chatEntry = new ChatEntry();
                chatEntry.setSender_ID(0L); // System als Sender
                chatEntry.setReceiver_ID(market.user_ID);
                chatEntry.setMessage("Willkommen im Chat! (Fach: " + fachName + ", User: " + userName + ")");
                chatEntry.setTime(new Timestamp(System.currentTimeMillis()));

                chatEntryList.add(chatEntry);
            }
        }

        // 3) Anzahl der Einträge begrenzen
        if (chatEntryList.size() > MAX_CHAT_ENTRIES) {
            chatEntryList = chatEntryList.subList(0, MAX_CHAT_ENTRIES);
        }

        System.out.println("[DEBUG] About to persist " + chatEntryList.size() + " chat entries");

        // 4) Persistiere alle ChatEntry-Objekte
        int count = 0;
        for (ChatEntry entry : chatEntryList) {
            chatRepository.persist(entry);
            System.out.println("[DEBUG] Persisted chat entry " + count + " with message: " + entry.getMessage());
            count++;
        }

        System.out.println("[INFO] Finished generating chat entries. Total created: " + chatEntryList.size());
    }
}
