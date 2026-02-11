package at.htl.endpoints.dto;

import java.util.List;

public record MarketDto(String username, List<String> offers, List<String> demands) {
}
