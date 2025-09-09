package com.example.plugins

import com.example.models.Client
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.*

// Lista em memória para simular uma base de dados temporária
val clientList = mutableListOf<Client>()

fun Application.configureRouting() {
    routing {
        // Rota de boas-vindas
        get("/") {
            call.respondText("Bem-vindo ao Backend do Gerencia App!")
        }

        // Rotas da API para os clientes
        route("/api") {
            // Obter todos os clientes
            get("/clients") {
                call.respond(clientList)
            }

            // Adicionar um novo cliente
            post("/clients") {
                val client = call.receive<Client>()
                // Numa aplicação real, geraria um ID apropriado
                val newClient = client.copy(id = UUID.randomUUID().toString())
                clientList.add(newClient)
                call.respond(mapOf("status" to "Cliente adicionado com sucesso", "client" to newClient))
            }
        }
    }
}

