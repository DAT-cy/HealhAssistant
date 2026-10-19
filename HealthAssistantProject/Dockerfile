FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace
COPY . .
RUN sed -i 's/\r$//' gradlew \
    && chmod +x gradlew \
    && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar /app/app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar", "--server.port=8081"]
