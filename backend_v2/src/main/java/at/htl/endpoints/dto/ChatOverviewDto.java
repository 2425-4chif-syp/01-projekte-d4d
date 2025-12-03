package at.htl.endpoints.dto;

import java.sql.Timestamp;

public class ChatOverviewDto {
    public Long userId;
    public String username;
    public String lastMessage;
    public Timestamp timestamp;
    public int unreadCount;

    public ChatOverviewDto(Long userId, String username, String lastMessage, Timestamp timestamp, int unreadCount) {
        this.userId = userId;
        this.username = username;
        this.lastMessage = lastMessage;
        this.timestamp = timestamp;
        this.unreadCount = unreadCount;
    }
}
