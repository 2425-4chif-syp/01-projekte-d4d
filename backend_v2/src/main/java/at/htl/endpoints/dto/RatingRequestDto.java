package at.htl.endpoints.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class RatingRequestDto {
    
    @NotNull(message = "Service ID ist erforderlich")
    private Long serviceId;
    
    @NotNull(message = "Sterne-Bewertung ist erforderlich")
    @Min(value = 0, message = "Bewertung muss zwischen 0 und 5 Sternen liegen")
    @Max(value = 5, message = "Bewertung muss zwischen 0 und 5 Sternen liegen")
    private Integer stars;
    
    @Size(max = 1000, message = "Kommentar darf maximal 1000 Zeichen lang sein")
    private String comment;

    public RatingRequestDto() {}

    public RatingRequestDto(Long serviceId, Integer stars, String comment) {
        this.serviceId = serviceId;
        this.stars = stars;
        this.comment = comment;
    }

    public Long getServiceId() {
        return serviceId;
    }

    public void setServiceId(Long serviceId) {
        this.serviceId = serviceId;
    }

    public Integer getStars() {
        return stars;
    }

    public void setStars(Integer stars) {
        this.stars = stars;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}