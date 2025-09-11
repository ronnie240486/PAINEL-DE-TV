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
app.use(express.urlencoded({ extended: true }));
// Mantendo o parser de texto, mas com lógica robusta para lidar com ele
app.use(express.text({ type: '*/*' }));


// Middleware de diagnóstico para registar todos os pedidos recebidos.
app.use((req, res, next) => {
    console.log(`[LOG] Pedido recebido: ${req.method} ${req.originalUrl} | User-Agent: ${req.headers['user-agent']}`);
    next(); // Passa o pedido para a próxima etapa (a rota correta)
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

// --- (NOVO!) FUNÇÃO CENTRALIZADA PARA DECODIFICAR PEDIDOS ---
function decodeRequestBody(req) {
    let base64Data = null;

    // Logs de depuração para entender o que está a ser recebido
    console.log("--- Iniciando decodificação ---");
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Corpo do pedido (tipo):", typeof req.body);
    // console.log("Corpo do pedido (conteúdo):", req.body); // Descomente para ver o conteúdo completo

    if (typeof req.body === 'object' && req.body !== null && req.body.data) {
        // Caso 1: Corpo JSON ou urlencoded como { data: "..." }
        base64Data = req.body.data;
    } else if (typeof req.body === 'string') {
        // Caso 2: Corpo como texto simples
        if (req.body.startsWith('data=')) {
            base64Data = req.body.substring(5); // Remove "data="
        } else {
             // Tenta analisar a string como JSON para o caso de ter sido mal interpretada como texto
            try {
                const parsedBody = JSON.parse(req.body);
                if (parsedBody && parsedBody.data) {
                    base64Data = parsedBody.data;
                } else {
                     base64Data = req.body;
                }
            } catch (e) {
                // Não é um JSON, assume que a string inteira é o dado
                base64Data = req.body;
            }
        }
    }

    if (!base64Data || typeof base64Data !== 'string') {
        console.warn("⚠️ Não foi possível extrair a string Base64 do corpo do pedido.");
        console.log("--- Fim da decodificação ---");
        return null;
    }

    try {
        const sanitizedBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
        if (sanitizedBase64.length === 0) {
            console.warn("⚠️ Dados Base64 estavam vazios após a limpeza.");
            console.log("--- Fim da decodificação ---");
            return null;
        }

        const decodedString = Buffer.from(sanitizedBase64, 'base64').toString('utf8');
        console.log("String decodificada (bruta):", decodedString);

        // Limpeza agressiva final: remove todos os caracteres não imprimíveis
        const cleanString = decodedString.replace(/[^\x20-\x7E]/g, '');
        
        const firstBracket = cleanString.indexOf('{');
        const lastBracket = cleanString.lastIndexOf('}');

        if (firstBracket !== -1 && lastBracket > firstBracket) {
            const potentialJson = cleanString.substring(firstBracket, lastBracket + 1);
            const jsonData = JSON.parse(potentialJson);
            console.log("Dados decodificados com sucesso:", jsonData);
            console.log("--- Fim da decodificação ---");
            return jsonData;
        } else {
            console.warn("Nenhum objeto JSON válido encontrado na string decodificada e limpa.");
            console.log("--- Fim da decodificação ---");
            return null;
        }
    } catch (err) {
        console.error("Erro final ao processar dados:", err.message);
        console.log("--- Fim da decodificação ---");
        return null;
    }
}


// --- ROTAS DA API ---

// Rota de Saúde
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend do Gerencia App a funcionar!' });
});

// Rota para receber POSTs da Smart TV
app.post('/', (req, res) => {
    console.log('Recebido POST da Smart TV na raiz do servidor.');
    const decodedData = decodeRequestBody(req);
    // Responde sempre com sucesso para a app não dar erro de rede, mesmo que a decodificação falhe.
    res.status(200).json({ status: 'success', message: 'Dados recebidos pelo servidor.' });
});


// ROTA TEMPORÁRIA PARA CRIAR O PRIMEIRO ADMIN - APAGAR DEPOIS DE USAR!
app.get('/api/setup/create-admin', async (req, res) => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (adminExists) {
            return res.status(400).send('O admin já existe.');
        }
        const hashedPassword = await bcrypt.hash('admin123', 10); // Senha temporária
        const admin = new User({ username: 'admin', password: hashedPassword, role: 'admin', credits: 99999 });
        await admin.save();
        res.status(201).send('Admin criado com sucesso! Use o utilizador "admin" e a senha "admin123" para entrar. Apague esta rota agora!');
    } catch (error) {
        res.status(500).send('Erro ao criar admin.');
    }
});


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
    const decodedData = decodeRequestBody(req);

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

apiCompatibilityRouter.use((req, res) => {
    res.status(404).json({ status: "error", message: `Endpoint de compatibilidade não encontrado: ${req.originalUrl}` });
});


// ==================================================================
// == CAMADA DE COMPATIBILIDADE V4 PARA A APLICAÇÃO ANDROID ==
// ==================================================================
const apiV4CompatibilityRouter = express.Router();

// Rota para a nova versão da app Android
apiV4CompatibilityRouter.post('/guim.php', async (req, res) => {
    console.log("Recebido pedido na rota de compatibilidade V4 /api/v4/guim.php");
    const decodedData = decodeRequestBody(req);

    try {
        // A lógica é a mesma da API de compatibilidade anterior
        const clients = await Client.find({ type: 'Usuario' });
        res.json({
            status: "success",
            message: "Dados obtidos com sucesso (v4)",
            data: clients
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Erro no servidor (v4)" });
    }
});


// ==================================================================
// == ROTAS MODERNAS PARA O PAINEL HTML (JÁ EXISTENTES) ==
// ==================================================================
const modernApiRouter = express.Router();

// --- ROTAS DE AUTENTICAÇÃO E UTILIZADORES ---
modernApiRouter.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: "Utilizador não encontrado" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Palavra-passe incorreta" });
        }
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'seu_segredo_super_secreto',
            { expiresIn: '8h' }
        );
        res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: "Erro no servidor", error: error.message });
    }
});

// --- ROTAS DE CLIENTES ---
// Rota GET para todos os clientes, para simplificar o frontend.
modernApiRouter.get('/clients', authMiddleware, async (req, res) => {
    try {
        const clients = await Client.find({}); // Busca todos os clientes
        res.json(clients);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
modernApiRouter.post('/clients', authMiddleware, async (req, res) => {
    const client = new Client(req.body);
    try {
        const newClient = await client.save();
        res.status(201).json(newClient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});
modernApiRouter.put('/clients/:id', authMiddleware, async (req, res) => {
    try {
        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedClient) return res.status(404).json({ message: 'Cliente não encontrado' });
        res.json(updatedClient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});
modernApiRouter.delete('/clients/:id', authMiddleware, async (req, res) => {
    try {
        const deletedClient = await Client.findByIdAndDelete(req.params.id);
        if (!deletedClient) return res.status(404).json({ message: 'Cliente não encontrado' });
        res.json({ message: 'Cliente apagado com sucesso' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Ligar os routers na ordem correta: do mais específico para o mais geral.
app.use('/api/v2', modernApiRouter); // A nova API para o painel é verificada primeiro.
app.use('/api/v4', apiV4CompatibilityRouter); // A API v4 para a app Android
app.use('/api', apiCompatibilityRouter); // A API de compatibilidade é verificada depois.


// Iniciar o Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});

