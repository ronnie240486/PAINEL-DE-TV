# Usar uma imagem base com OpenJDK (para rodar seu aplicativo Kotlin/Java)
FROM openjdk:17-slim

# Instalar wget, unzip e Gradle
RUN apt-get update -y && apt-get install -y wget unzip \
    # Baixar e instalar o Gradle
    && wget https://services.gradle.org/distributions/gradle-8.0-bin.zip -O gradle.zip \
    && unzip gradle.zip -d /opt \
    && rm gradle.zip \
    && ln -s /opt/gradle-8.0/bin/gradle /usr/bin/gradle \
    # Instalar o Java 17
    && apt-get install -y openjdk-17-jdk \
    # Configurar JAVA_HOME
    && echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64" >> /etc/profile.d/java.sh \
    && echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /etc/profile.d/java.sh \
    # Aplicar as mudanças
    && source /etc/profile.d/java.sh

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie todos os arquivos do diretório atual para dentro do contêiner
COPY . .

# Rodar o Gradle para construir a aplicação
RUN gradle build

# Expor a porta que a aplicação vai usar (geralmente 8080 no caso do Ktor)
EXPOSE 8080

# Comando para rodar a aplicação
CMD ["java", "-jar", "build/libs/backend-kotlin-0.0.1.jar"]
