const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'agendamentos.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Garantir que o arquivo de dados existe
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Funções para manipular o arquivo JSON
const readAgendamentos = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler arquivo:', error);
    return [];
  }
};

const writeAgendamentos = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao escrever arquivo:', error);
    return false;
  }
};

// Rotas da API
// GET - Listar todos os agendamentos
app.get('/api/agendamentos', (req, res) => {
  const agendamentos = readAgendamentos();
  res.json(agendamentos);
});

// GET - Buscar agendamentos por data
app.get('/api/agendamentos/data/:data', (req, res) => {
  const { data } = req.params;
  const agendamentos = readAgendamentos();
  
  const agendamentosFiltrados = agendamentos.filter(ag => {
    const agDate = new Date(ag.data).toISOString().split('T')[0];
    return agDate === data;
  });
  
  res.json(agendamentosFiltrados);
});

// GET - Buscar horários ocupados por data
app.get('/api/agendamentos/ocupados/:data', (req, res) => {
  const { data } = req.params;
  const agendamentos = readAgendamentos();
  
  const horariosOcupados = agendamentos
    .filter(ag => {
      const agDate = new Date(ag.data).toISOString().split('T')[0];
      return agDate === data && ag.status !== 'cancelado';
    })
    .map(ag => ag.horario);
  
  res.json(horariosOcupados);
});

// POST - Criar novo agendamento
app.post('/api/agendamentos', (req, res) => {
  const { nome, telefone, email, servico, data, horario, valor } = req.body;
  
  // Validar dados
  if (!nome || !telefone || !email || !servico || !data || !horario || !valor) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
  }
  
  const agendamentos = readAgendamentos();
  
  // Verificar se já existe agendamento no mesmo horário
  const conflito = agendamentos.find(ag => {
    const agDate = new Date(ag.data).toISOString().split('T')[0];
    const newDate = new Date(data).toISOString().split('T')[0];
    return agDate === newDate && ag.horario === horario && ag.status !== 'cancelado';
  });
  
  if (conflito) {
    return res.status(400).json({ message: 'Já existe um agendamento para este horário' });
  }
  
  // Criar novo agendamento
  const novoAgendamento = {
    id: uuidv4(),
    nome,
    telefone,
    email,
    servico,
    data: new Date(data).toISOString(),
    horario,
    valor: parseFloat(valor),
    status: 'confirmado',
    dataCriacao: new Date().toISOString()
  };
  
  agendamentos.push(novoAgendamento);
  
  if (writeAgendamentos(agendamentos)) {
    res.status(201).json(novoAgendamento);
  } else {
    res.status(500).json({ message: 'Erro ao salvar agendamento' });
  }
});

// PUT - Atualizar status de agendamento
app.put('/api/agendamentos/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const agendamentos = readAgendamentos();
  const index = agendamentos.findIndex(ag => ag.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Agendamento não encontrado' });
  }
  
  agendamentos[index].status = status;
  
  if (writeAgendamentos(agendamentos)) {
    res.json(agendamentos[index]);
  } else {
    res.status(500).json({ message: 'Erro ao atualizar agendamento' });
  }
});

// DELETE - Cancelar agendamento
app.delete('/api/agendamentos/:id', (req, res) => {
  const { id } = req.params;
  
  const agendamentos = readAgendamentos();
  const index = agendamentos.findIndex(ag => ag.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Agendamento não encontrado' });
  }
  
  // Marcar como cancelado em vez de remover
  agendamentos[index].status = 'cancelado';
  
  if (writeAgendamentos(agendamentos)) {
    res.json({ message: 'Agendamento cancelado com sucesso' });
  } else {
    res.status(500).json({ message: 'Erro ao cancelar agendamento' });
  }
});

// Servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${3000}`);
  console.log(`Acesse: http://localhost:${3000}`);
});