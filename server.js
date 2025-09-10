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

// --- ROTAS DA API ---

// Rota de Saúde
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend do Gerencia App a funcionar!' });
});


// ==================================================================
// == (NOVO!) CAMADA DE COMPATIBILIDADE PARA A APLICAÇÃO ANTIGA ==
// ==================================================================
const apiCompatibilityRouter = express.Router();

// Simula o endpoint /api/guim.php
// Esta rota irá agora responder quando a sua app tentar aceder a este endereço.
apiCompatibilityRouter.post('/guim.php', async (req, res) => {
    console.log("Recebido pedido na rota de compatibilidade /api/guim.php");
    console.log("Corpo do pedido:", req.body); // Para ver o que a app está a enviar

    // LÓGICA DE EXEMPLO:
    // Aqui, você precisaria de adicionar a lógica que o seu guim.php antigo fazia.
    // Por exemplo, verificar um utilizador e senha que a app envia.
    // Como demonstração, vamos apenas devolver a lista de clientes internos.
    try {
        const clients = await Client.find({ type: 'Usuario' });
        // As apps antigas podem esperar um formato de resposta específico.
        // Isto é apenas um exemplo.
        res.json({
            status: "success",
            message: "Dados obtidos com sucesso",
            data: clients
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Erro no servidor" });
    }
});

// Qualquer outro pedido para /api/ que não seja /api/guim.php
apiCompatibilityRouter.use((req, res) => {
    res.status(404).json({ status: "error", message: `Endpoint de compatibilidade não encontrado: ${req.originalUrl}` });
});

// Liga o nosso router de compatibilidade ao endereço /api
app.use('/api', apiCompatibilityRouter);


// ==================================================================
// == ROTAS MODERNAS PARA O PAINEL HTML (JÁ EXISTENTES) ==
// ==================================================================
const modernApiRouter = express.Router();

// --- ROTAS DE AUTENTICAÇÃO E UTILIZADORES ---
modernApiRouter.post('/users/register', authMiddleware, async (req, res) => {
     if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado." });
    }
    // ... restante da lógica ...
});
modernApiRouter.post('/auth/login', async (req, res) => {
    // ... restante da lógica ...
});

// --- ROTAS DE CLIENTES ---
modernApiRouter.get('/clients/:type', authMiddleware, async (req, res) => {
    try {
        const clientType = req.params.type === 'external' ? 'Externo' : 'Usuario';
        const clients = await Client.find({ type: clientType });
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
// Liga o nosso router moderno ao endereço /api/v2 (para não haver conflitos)
// ATENÇÃO: Terá de atualizar a URL no seu painel HTML para /api/v2
app.use('/api/v2', modernApiRouter);


// Iniciar o Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});

