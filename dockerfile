# Defina a imagem base para o ambiente de execução
FROM openjdk:17-slim

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie todos os arquivos do diretório atual para o diretório /app dentro do contêiner
COPY . .

# Dê permissão de execução ao script gradlew
RUN chmod +x backend-kotlin/gradlew

# Navegue até o diretório backend-kotlin e execute o comando de build
RUN cd backend-kotlin && ./gradlew build

# Exponha a porta que a aplicação vai usar (8080 no caso do Ktor)
EXPOSE 8080

# Comando para iniciar a aplicação a partir do binário gerado pelo Gradle
CMD ["./backend-kotlin/build/install/backend-kotlin/bin/backend-kotlin"]
