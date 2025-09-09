# Use uma imagem base com OpenJDK (para rodar seu aplicativo Kotlin/Java)
FROM openjdk:17-slim

# Instalar Gradle no contêiner
RUN apt-get update && apt-get install -y wget \
    && wget https://services.gradle.org/distributions/gradle-8.0-bin.zip \
    && unzip gradle-8.0-bin.zip -d /opt \
    && rm gradle-8.0-bin.zip \
    && ln -s /opt/gradle-8.0/bin/gradle /usr/bin/gradle

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie todos os arquivos do diretório atual para dentro do contêiner
COPY . .

# Dê permissão de execução ao script gradlew, caso ele apareça ou se for necessário
RUN chmod +x /app/gradlew

# Execute o comando para construir a aplicação
RUN gradle build

# Exponha a porta que a aplicação vai usar (geralmente 8080 no caso do Ktor)
EXPOSE 8080

# Comando para rodar a aplicação
CMD ["java", "-jar", "build/libs/backend-kotlin.jar"]

