package at.htl.d4d;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
public class GetInfosTest {
            @Test
            public void testGetPerfektMatchInfos() {
                Response response = given()
                        .when()
                        .get("/infos/perfekt-match")
                        .then()
                        .statusCode(200) // Überprüfe, ob der Statuscode 200 ist
                        .extract().response();
        
                // Extrahiere die Liste von Strings aus der Antwort
                List<String> perfektMatches = response.jsonPath().getList("$");
        
                System.out.println(perfektMatches);

                // Validiere, dass die Liste nicht leer ist
                assertEquals(true, perfektMatches.size() > 0, "Liste ist leer");
            }
}