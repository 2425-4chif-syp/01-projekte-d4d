package at.htl.endpoints.dto;

public class UserRatingStatsDto {
    
    private Long userId;
    private String userName;
    private Double averageRating;
    private Long totalReviews;

    public UserRatingStatsDto() {}

    public UserRatingStatsDto(Long userId, String userName, Double averageRating, Long totalReviews) {
        this.userId = userId;
        this.userName = userName;
        this.averageRating = averageRating;
        this.totalReviews = totalReviews;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public Long getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(Long totalReviews) {
        this.totalReviews = totalReviews;
    }
}