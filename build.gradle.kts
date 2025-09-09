val ktor_version = "2.3.10"
val kotlin_version = "1.9.23"
val logback_version = "1.2.11"  // Ou qualquer versão que você desejar

plugins {
    kotlin("jvm") version "1.9.23"
    id("io.ktor.plugin") version "2.3.10"
    kotlin("plugin.serialization") version "1.9.23"
}

group = "com.example"
version = "0.0.1"

application {
    mainClass.set("com.example.ApplicationKt") // A classe principal do seu app Ktor
}

repositories {
    mavenCentral()
}

dependencies {
    // Ktor Core
    implementation("io.ktor:ktor-server-core-jvm:$ktor_version")
    implementation("io.ktor:ktor-server-netty-jvm:$ktor_version")

    // Content Negotiation for JSON
    implementation("io.ktor:ktor-server-content-negotiation-jvm:$ktor_version")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm:$ktor_version")

    // Logging
    implementation("io.ktor:ktor-server-call-logging-jvm:$ktor_version")
    implementation("ch.qos.logback:logback-classic:$logback_version")
    
    // Coroutines (já incluído com Kotlin, mas é bom ser explícito)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")

    // Testing
    testImplementation("io.ktor:ktor-server-tests-jvm:$ktor_version")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit:$kotlin_version")
}
