FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn/ .mvn/
COPY pom.xml .
COPY src/ src/
RUN chmod +x mvnw
RUN ./mvnw package -DskipTests

# Show what was built and copy any JAR to app.jar
RUN echo "=== Build output ===" && ls -la /app/target/ && \
    find /app/target -name "*.jar" -type f ! -name "*-sources.jar" ! -name "*-javadoc.jar" -exec cp {} /app/app.jar \; && \
    ls -la /app/app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/app.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]