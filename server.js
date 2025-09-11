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

// (ATUALIZADO!) Adiciona um "saver" para o corpo cru do pedido em todos os parsers
const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};
app.use(express.json({ verify: rawBodySaver }));
app.use(express.urlencoded({ extended: true, verify: rawBodySaver }));
// Mantendo o parser de texto, mas com lógica robusta para lidar com ele
app.use(express.text({ type: '*/*', verify: rawBodySaver }));


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

// --- (NOVA FUNÇÃO!) FUNÇÃO ROBUSTA MELHORADA PARA DECODIFICAR DADOS ---
function decodeAndParseBody(rawBody) {
  try {
    let dataStr;

    if (rawBody && rawBody.data) {
      // Limpa caracteres não-Base64
      const sanitized = String(rawBody.data).replace(/[^A-Za-z0-9+/=]+/g, '');
      
      // Tenta decodificar Base64
      try {
        dataStr = Buffer.from(sanitized, 'base64').toString('utf8');
      } catch (err) {
        console.warn('Erro ao decodificar Base64, tentando string bruta...', err.message);
        dataStr = rawBody.data; // Usa o dado bruto como fallback
      }
    } else {
      // Se não houver campo 'data', trata o corpo todo como JSON
      dataStr = JSON.stringify(rawBody);
    }

    // Extrai o primeiro objeto JSON válido da string (ignora lixo no início ou no final)
    const firstJsonMatch = dataStr.match(/\{.*\}/s);
    if (!firstJsonMatch) {
      console.warn('Nenhum objeto JSON válido encontrado na string decodificada.');
      return null;
    }

    // Parse seguro do JSON extraído
    try {
      const json = JSON.parse(firstJsonMatch[0]);
      console.log('Dados decodificados com sucesso:', json);
      return json;
    } catch (parseErr) {
      console.warn('JSON inválido após extração:', parseErr.message);
      return null;
    }
  } catch (err) {
    console.error('Erro geral ao processar dados:', err.message);
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
    const decodedData = decodeAndParseBody(req.body);
    if (!decodedData) {
        return res.status(400).json({ error: 'JSON inválido ou dados corrompidos' });
    }
    res.status(200).json({ status: 'success', message: 'Dados recebidos pelo servidor.', received: decodedData });
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
    const decodedData = decodeAndParseBody(req.body);
    
    if (!decodedData) {
        console.warn("Decodificação falhou, respondendo com lista de clientes para compatibilidade.");
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
    
    const decodedData = decodeAndParseBody(req.body);
    if (!decodedData) {
        // Fallback de compatibilidade: responde com sucesso e lista de clientes para não quebrar a app
        console.warn("Decodificação falhou na V4, respondendo com lista de clientes para compatibilidade.");
    }

    try {
        const clients = await Client.find({ type: 'Usuario' });
        res.json({
            status: "success",
            message: "Dados obtidos com sucesso (v4)",
            data: clients,
            received: decodedData // Opcional: devolver o que foi recebido para depuração
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
        if (!deletedClient) return res.status(4e4).json({ message: 'Cliente não encontrado' });
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

