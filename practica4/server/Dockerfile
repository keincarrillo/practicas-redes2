# Etapa 1: construir el JAR con Maven
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copiamos los archivos del proyecto
COPY pom.xml .
COPY src ./src

# Construimos el JAR (sin tests)
RUN mvn clean package -DskipTests

# Etapa 2: imagen ligera solo con el JAR
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copiamos el JAR construido desde la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# Render pone la variable PORT, tu código ya la usa
EXPOSE 8080

# Comando para arrancar el servidor
CMD ["java", "-cp", "app.jar", "org.example.HttpServerPool"]

