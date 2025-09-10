// 1. Importar as ferramentas necessárias
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Carrega as variáveis do ficheiro .env

// 2. Inicializar a aplicação Express
const app = express();
app.use(cors()); // Permite que o seu painel HTML comunique com este servidor
app.use(express.json()); // Permite ao servidor entender JSON

// 3. Ligar à Base de Dados MongoDB Atlas
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(() => console.log("Ligação ao MongoDB Atlas bem-sucedida!"))
  .catch(err => console.error("Erro ao ligar ao MongoDB:", err));

// 4. (NOVO) ROTA DE SAÚDE - Para responder ao Railway
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend do Gerencia App a funcionar!' });
});

// 5. Definir a estrutura (Schema) para os Clientes
const clientSchema = new mongoose.Schema({
    serverName: String,
    mac: { type: String, unique: true, sparse: true }, // MAC é único, mas pode não existir (sparse)
    login: { type: String, unique: true, sparse: true },// Login é único, mas pode não existir
    password: { type: String },
    phone: String,
    m3u8_list: String,
    epg_url: String,
    price: String,
    status: String,
    type: String, // 'internal' ou 'external'
    creationDate: { type: Date, default: Date.now },
    expirationDate: Date,
});

const Client = mongoose.model('Client', clientSchema);

// 6. Criar os Endpoints da API

// Obter todos os clientes (internos ou externos)
app.get('/api/clients/:type', async (req, res) => {
    try {
        const clientType = req.params.type === 'external' ? 'Externo' : 'Usuario';
        const clients = await Client.find({ type: clientType });
        res.json(clients);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Adicionar um novo cliente
app.post('/api/clients', async (req, res) => {
    const client = new Client(req.body);
    try {
        const newClient = await client.save();
        res.status(201).json(newClient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// ... (futuramente, adicionar aqui as rotas para editar, apagar, etc.)

// 7. Iniciar o Servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});


