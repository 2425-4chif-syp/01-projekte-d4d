FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn/ .mvn/
COPY pom.xml .
COPY src/ src/
RUN chmod +x mvnw
RUN ./mvnw package -DskipTests
# Find and rename the uber-jar to a consistent name
RUN cp /app/target/*-runner.jar /app/app.jar || cp /app/target/backend-*.jar /app/app.jar
RUN ls -la /app/

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/app.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]