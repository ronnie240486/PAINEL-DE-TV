// Importação das ferramentas necessárias
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Carrega as variáveis do ficheiro .env

// Inicializa a aplicação Express
const app = express();

// Middleware (funções que correm em todos os pedidos)
app.use(cors()); // Permite que o seu painel HTML comunique com este servidor
app.use(express.json()); // Permite ao servidor entender o formato JSON

// --- LIGAÇÃO À BASE DE DADOS MONGODB ATLAS ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Ligação ao MongoDB Atlas bem-sucedida!"))
  .catch(err => console.error("Erro ao ligar ao MongoDB:", err));

// --- DEFINIÇÃO DO MODELO DE DADOS (A "FORMA" DE UM CLIENTE) ---
const clientSchema = new mongoose.Schema({
    login: { type: String, required: false }, // Para clientes externos
    password: { type: String, required: false }, // Para clientes externos
    mac: { type: String, required: false }, // Para clientes internos
    serverName: { type: String, required: true },
    phone: String,
    m3u8_list: String,
    epg_url: String,
    price: String,
    status: { type: String, default: 'Liberado' },
    type: { type: String, required: true }, // 'Usuario' ou 'Externo'
    creationDate: { type: Date, default: Date.now },
    expirationDate: Date,
});

const Client = mongoose.model('Client', clientSchema);

// --- ROTAS DA API ---

// Rota de boas-vindas
app.get('/api', (req, res) => {
  res.send('Bem-vindo ao Backend do Gerencia App (Node.js)!');
});

// GET /api/clients/:type - Obter todos os clientes (internos ou externos)
app.get('/api/clients/:type', async (req, res) => {
  try {
    const clientType = req.params.type === 'internal' ? 'Usuario' : 'Externo';
    const clients = await Client.find({ type: clientType });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar clientes', error });
  }
});

// POST /api/clients - Adicionar um novo cliente
app.post('/api/clients', async (req, res) => {
  try {
    const newClient = new Client(req.body);
    await newClient.save();
    res.status(201).json({ status: 'Cliente adicionado com sucesso', client: newClient });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao adicionar cliente', error });
  }
});

// PUT /api/clients/:id - Atualizar um cliente
app.put('/api/clients/:id', async (req, res) => {
    try {
        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ status: 'Cliente atualizado com sucesso', client: updatedClient });
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar cliente', error });
    }
});

// DELETE /api/clients/:id - Apagar um cliente
app.delete('/api/clients/:id', async (req, res) => {
    try {
        await Client.findByIdAndDelete(req.params.id);
        res.json({ status: 'Cliente apagado com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao apagar cliente', error });
    }
});


// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});


