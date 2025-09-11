// 1. Importar as ferramentas necessárias
const express = require('express');
const cors = require('cors');
const crypto = require('crypto'); // Para gerar IDs únicos para novos clientes

// 2. Inicializar a aplicação Express
const app = express();
const PORT = process.env.PORT || 8080; // Usar a porta do ambiente ou 8080

// Habilita o CORS para permitir pedidos do painel e outras apps.
app.use(cors());
// Permite que o servidor entenda o corpo de pedidos em formato JSON.
app.use(express.json());

// --- BASE DE DADOS SIMULADA (MOCK) ---
// Para demonstração, guardamos os dados em memória.
// Numa aplicação real, isto viria de uma base de dados como MongoDB.

const MOCK_USERS = [
    { _id: 'admin01', username: 'admin', password: 'admin123', role: 'admin' }
];

let MOCK_CLIENTS = [
    { _id: 'client01', serverName: 'Sala TV (Exemplo)', mac: '00:1A:2B:3C:4D:5E', type: 'Usuario', status: 'Liberado', phone: '(11) 98765-4321', price: '25.00', creationDate: new Date('2025-08-01T10:00:00Z'), expirationDate: new Date('2026-08-01T10:00:00Z') },
    { _id: 'client02', serverName: 'Quarto Principal (Exemplo)', mac: 'AA:BB:CC:DD:EE:FF', type: 'Usuario', status: 'Bloqueado', phone: '(21) 91234-5678', price: '30.00', creationDate: new Date('2025-07-15T14:30:00Z'), expirationDate: new Date('2025-09-15T14:30:00Z') },
    { _id: 'client03', serverName: 'Cliente Externo (Exemplo)', login: 'user_externo', type: 'Externo', status: 'Liberado', phone: '(31) 95555-1234', price: '40.00', creationDate: new Date('2025-09-01T11:00:00Z'), expirationDate: new Date('2026-09-01T11:00:00Z') }
];

// --- MIDDLEWARE DE AUTENTICAÇÃO SIMULADO ---
// Verifica se um "token" de autenticação foi enviado no pedido.
// Numa app real, isto usaria JWT para validar o token.
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Para esta simulação, aceitamos um token fixo.
    if (token === 'dummy-auth-token-12345') {
        next(); // Token válido, pode prosseguir.
    } else {
        res.status(401).json({ message: 'Acesso não autorizado. Token inválido ou ausente.' });
    }
};


// ==================================================================
// == ROTAS MODERNAS PARA O PAINEL HTML (API v2) ==
// ==================================================================
const apiV2Router = express.Router();

// Rota de Login: [POST] /api/v2/auth/login
apiV2Router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = MOCK_USERS.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    if (user) {
        // Login bem-sucedido: envia um token simulado e os dados do utilizador.
        res.json({
            token: 'dummy-auth-token-12345',
            user: { id: user._id, username: user.username, role: user.role }
        });
    } else {
        // Credenciais inválidas.
        res.status(401).json({ message: 'Utilizador ou palavra-passe incorretos' });
    }
});

// A partir daqui, todas as rotas de clientes exigem autenticação.
apiV2Router.use('/clients', authMiddleware);

// Obter todos os clientes: [GET] /api/v2/clients
apiV2Router.get('/clients', (req, res) => {
    res.json(MOCK_CLIENTS);
});

// Criar um novo cliente: [POST] /api/v2/clients
apiV2Router.post('/clients', (req, res) => {
    const newClient = {
        _id: crypto.randomUUID(), // Gera um ID único
        ...req.body,
        creationDate: new Date() // Define a data de criação
    };
    MOCK_CLIENTS.push(newClient);
    res.status(201).json(newClient); // Responde com o cliente criado
});

// Atualizar um cliente existente: [PUT] /api/v2/clients/:id
apiV2Router.put('/clients/:id', (req, res) => {
    const { id } = req.params;
    const index = MOCK_CLIENTS.findIndex(c => c._id === id);
    if (index !== -1) {
        // Atualiza o cliente na base de dados simulada
        MOCK_CLIENTS[index] = { ...MOCK_CLIENTS[index], ...req.body };
        res.json(MOCK_CLIENTS[index]); // Responde com o cliente atualizado
    } else {
        res.status(404).json({ message: 'Cliente não encontrado' });
    }
});

// Apagar um cliente: [DELETE] /api/v2/clients/:id
apiV2Router.delete('/clients/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = MOCK_CLIENTS.length;
    MOCK_CLIENTS = MOCK_CLIENTS.filter(c => c._id !== id);
    
    if (MOCK_CLIENTS.length < initialLength) {
        res.json({ message: 'Cliente apagado com sucesso' });
    } else {
        res.status(404).json({ message: 'Cliente não encontrado' });
    }
});

// Ligar o router da API v2 ao caminho /api/v2
app.use('/api/v2', apiV2Router);


// ==================================================================
// == CAMADA DE COMPATIBILIDADE PARA APPS ANTIGAS ==
// ==================================================================

// Rota para Smart TV que envia dados para a raiz do servidor.
app.post('/', (req, res) => {
    console.log('Recebido um POST da Smart TV com os seguintes dados:', req.body);
    res.status(200).json({ 
        status: 'sucesso', 
        message: 'Dados recebidos pelo servidor.',
        dataRecebida: req.body 
    });
});

// Rota para a App Android que espera um ficheiro .php
app.get('/api/setting.php', (req, res) => {
    const settings = {
        "appName": "Gerencia App",
        "version": "1.2.5",
        "maintenanceMode": false,
        "welcomeMessage": "Bem-vindo à nossa aplicação!",
        "apiUrl": "https://backend-kotlin-production.up.railway.app/api"
    };
    res.json(settings);
});


// 4. Iniciar o Servidor
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});

