package at.htl.d4d;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.is;

@QuarkusTest
public class TestDataResourceTest {

    @Test
    public void testGenerateServiceTypesTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-service-types")
                .then()
                .statusCode(200)
                .body(is("Dienstleistungsarten-Testdaten erfolgreich generiert."));
    }

    @Test
    public void testGenerateUserTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-users")
                .then()
                .statusCode(200)
                .body(is("Benutzer-Testdaten erfolgreich generiert."));
    }

    @Test
    public void testGenerateMarketTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-market")
                .then()
                .statusCode(200)
                .body(is("Marktplatz-Testdaten erfolgreich generiert."));
    }

    @Test
    public void testGenerateServiceTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-service")
                .then()
                .statusCode(200)
                .body(is("Service-Testdaten erfolgreich generiert."));
    }

    // Neuer Test für die Chat-Testdaten
    @Test
    public void testGenerateChatTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-chat")
                .then()
                .statusCode(200)
                .body(is("Chat-Testdaten erfolgreich generiert."));
    }
    @Test
    public void testGenerateReviewTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-reviews")
                .then()
                .statusCode(200)
                .body(is("Review-Testdaten erfolgreich generiert."));
    }

}
