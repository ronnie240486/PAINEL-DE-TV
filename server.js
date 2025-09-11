// 1. Importar as ferramentas necessárias
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 2. Inicializar a aplicação Express
const app = express();
app.use(cors());
app.use(express.json());
// Permite que o servidor entenda dados de formulários (comuns em APIs antigas)
app.use(express.urlencoded({ extended: true }));

// Middleware de diagnóstico para registar todos os pedidos recebidos.
app.use((req, res, next) => {
    console.log(`[LOG] Pedido recebido: ${req.method} ${req.originalUrl} | User-Agent: ${req.headers['user-agent']}`);
    next(); // Passa o pedido para a próxima etapa (a rota correta)
});

// 🔹 Middleware para capturar body cru (útil para debugging)
app.use((req, res, next) => {
    let rawData = "";
    req.on("data", (chunk) => {
        rawData += chunk;
    });
    req.on("end", () => {
        if (rawData) {
            console.log("[RAW BODY]", rawData);
            req.rawBody = rawData;
        }
        next();
    });
});

// 3. Ligar à Base de Dados MongoDB Atlas
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri)
  .then(() => console.log("Ligação ao MongoDB Atlas bem-sucedida!"))
  .catch(err => console.error("Erro ao ligar ao MongoDB:", err));

// --- MODELOS DA BASE DE DADOS (sem alterações) ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'reseller'], default: 'reseller' },
    credits: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

const clientSchema = new mongoose.Schema({
    serverName: String,
    mac: { type: String, unique: true, sparse: true },
    login: { type: String, unique: true, sparse: true },
    password: { type: String },
    phone: String,
    m3u8_list: String,
    epg_url: String,
    price: String,
    status: String,
    type: String,
    creationDate: { type: Date, default: Date.now },
    expirationDate: Date,
    resellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Client = mongoose.model('Client', clientSchema);

// --- MIDDLEWARE DE AUTENTICAÇÃO (sem alterações) ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_super_secreto', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ==================================================================
// == CAMADA DE COMPATIBILIDADE PARA A APLICAÇÃO ANTIGA ==
// ==================================================================
const apiCompatibilityRouter = express.Router();

// Rota para a app Android
apiCompatibilityRouter.get('/setting.php', (req, res) => {
    console.log("Recebido pedido na rota de compatibilidade /api/setting.php");
    const settings = {
        "appName": "Gerencia App",
        "version": "1.2.5",
        "maintenanceMode": false,
        "welcomeMessage": "Bem-vindo à nossa aplicação!",
        "apiUrl": "https://backend-kotlin-production.up.railway.app/api" // Manter /api para a app antiga
    };
    res.json(settings);
});

apiCompatibilityRouter.post('/guim.php', async (req, res) => {
    console.log("Recebido pedido na rota de compatibilidade /api/guim.php");

    // 🔹 Novo log detalhado do body
    console.log("[GUIM] Body parseado:", req.body);
    if (req.rawBody) {
        console.log("[GUIM] Body cru:", req.rawBody);
    }

    if (req.body && req.body.data) {
        try {
            const sanitizedBase64 = req.body.data.replace(/[^A-Za-z0-9+/=]/g, '');
            const decodedString = Buffer.from(sanitizedBase64, 'base64').toString('utf8');

            const firstBracket = decodedString.indexOf('{');
            const lastBracket = decodedString.lastIndexOf('}');

            if (firstBracket !== -1 && lastBracket > firstBracket) {
                const potentialJson = decodedString.substring(firstBracket, lastBracket + 1);
                const cleanJson = potentialJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                const decodedData = JSON.parse(cleanJson);
                console.log('Dados descodificados da App (guim.php):', decodedData);
            } else {
                console.warn('Não foi encontrado um objeto JSON válido nos dados (guim.php).');
            }
        } catch (error) {
            console.error('Erro final ao processar dados (guim.php):', error.message);
        }
    }

    try {
        const clients = await Client.find({ type: 'Usuario' });
        res.json({
            status: "success",
            message: "Dados obtidos com sucesso",
            data: clients
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Erro no servidor" });
    }
});
