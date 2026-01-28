FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn/ .mvn/
COPY pom.xml .
COPY src/ src/
RUN chmod +x mvnw
RUN ./mvnw package -DskipTests

# Show what was built
RUN echo "=== Build output ===" && ls -la /app/target/

# Quarkus doesn't create uber-jar by default - use the quarkus-app directory
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/quarkus-app/lib/ /app/lib/
COPY --from=build /app/target/quarkus-app/*.jar /app/
COPY --from=build /app/target/quarkus-app/app/ /app/app/
COPY --from=build /app/target/quarkus-app/quarkus/ /app/quarkus/
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]