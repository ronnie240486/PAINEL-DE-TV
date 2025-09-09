package com.example.models

import kotlinx.serialization.Serializable

@Serializable
data class Client(
    val id: String,
    val serverName: String,
    val login: String, // Este campo pode ser usado para MAC ou Login de utilizador
    val type: String,
    val status: String,
    val creationDate: String,
    val expirationDate: String
)

