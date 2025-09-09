# Base image com OpenJDK 17
FROM openjdk:17-slim

# Instalar dependências necessárias (wget, unzip)
RUN apt-get update -y && apt-get install -y wget unzip curl

# Baixar e instalar o Gradle (se não estiver usando Gradle Wrapper)
RUN wget https://services.gradle.org/distributions/gradle-8.0-bin.zip -O gradle.zip \
    && unzip gradle.zip -d /opt/ \
    && rm gradle.zip \
    && ln -s /opt/gradle-8.0/bin/gradle /usr/bin/gradle

# Copiar o código do projeto para o contêiner
WORKDIR /app
COPY . /app

# Se o seu diretório "backend-kotlin" for realmente necessário, use:
# WORKDIR /app/backend-kotlin

# Dar permissão de execução ao wrapper do Gradle (caso esteja usando o gradle-wrapper)
RUN chmod +x gradlew

# Rodar o Gradle para compilar a aplicação
RUN gradle build

# Expor a porta em que o servidor Ktor vai rodar (8080 é padrão)
EXPOSE 8080

# Definir o comando para rodar a aplicação após a construção
CMD ["java", "-jar", "build/libs/backend-kotlin-0.0.1.jar"]
