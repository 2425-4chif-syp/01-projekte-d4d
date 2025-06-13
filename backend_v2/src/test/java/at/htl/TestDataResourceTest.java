package at.htl;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class TestDataResourceTest {
    @Test
    @Order(1)
    public void testGenerateServiceTypesTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-service-types")
                .then()
                .statusCode(200)
                .body(is("Dienstleistungsarten-Testdaten erfolgreich generiert."));
    }

    @Test
    @Order(2)
    public void testGenerateUserTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-users")
                .then()
                .statusCode(200)
                .body(is("Benutzer-Testdaten erfolgreich generiert."));
    }

    @Test
    @Order(3)
    public void testGenerateMarketTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-markets")
                .then()
                .statusCode(200)
                .body(is("Marktplatz-Testdaten erfolgreich generiert."));
    }

    @Test
    @Order(4)
    public void testGenerateServiceTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-services")
                .then()
                .statusCode(200)
                .body(is("Service-Testdaten erfolgreich generiert."));
    }

    @Test
    @Order(5)
    public void testGenerateChatTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-chat-entries")
                .then()
                .statusCode(200)
                .body(is("Chat-Testdaten erfolgreich generiert."));
    }

    @Test
    @Order(6)
    public void testGenerateReviewTestData() {
        RestAssured.given()
                .when().post("d4d/testdata/generate-reviews")
                .then()
                .statusCode(200)
                .body(is("Review-Testdaten erfolgreich generiert."));
    }
}