# Usar uma imagem base com OpenJDK (para rodar seu aplicativo Kotlin/Java)
FROM openjdk:17-slim

# Instalar wget e unzip para baixar e extrair o Gradle
RUN apt-get update && apt-get install -y wget unzip \
    && wget https://services.gradle.org/distributions/gradle-8.0-bin.zip -O gradle.zip \
    && unzip gradle.zip -d /opt \
    && rm gradle.zip \
    && ln -s /opt/gradle-8.0/bin/gradle /usr/bin/gradle

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie todos os arquivos do diretório atual para dentro do contêiner
COPY . .

# Execute o comando Gradle para construir a aplicação
RUN gradle build

# Exponha a porta que a aplicação vai usar (geralmente 8080 no caso do Ktor)
EXPOSE 8080

# Comando para rodar a aplicação Ktor (ajustado para a saída do Gradle)
CMD ["java", "-jar", "build/libs/backend-kotlin-0.0.1.jar"]

