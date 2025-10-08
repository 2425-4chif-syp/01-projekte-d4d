package at.htl.endpoints.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class RatingRequestDto {
    
    @NotNull(message = "Service ID ist erforderlich")
    private Long serviceId;
    
    @NotNull(message = "Sterne-Bewertung ist erforderlich")
    @DecimalMin(value = "0.0", message = "Bewertung muss zwischen 0 und 5 Sternen liegen")
    @DecimalMax(value = "5.0", message = "Bewertung muss zwischen 0 und 5 Sternen liegen")
    private Double stars;
    
    @Size(max = 1000, message = "Kommentar darf maximal 1000 Zeichen lang sein")
    private String comment;

    public RatingRequestDto() {}

    public RatingRequestDto(Long serviceId, Double stars, String comment) {
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

    public Double getStars() {
        return stars;
    }

    public void setStars(Double stars) {
        this.stars = stars;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}