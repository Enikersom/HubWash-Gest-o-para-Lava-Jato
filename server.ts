import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, setDoc, doc, deleteDoc, getDocs, collection } from "firebase/firestore";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Inicialização opcional do Firebase Firestore no backend
let serverDb: any = null;
try {
  const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    if (cfg.projectId && cfg.apiKey) {
      const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        storageBucket: cfg.storageBucket,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId
      }, "hubwash-server");
      serverDb = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== "(default)"
        ? getFirestore(fbApp, cfg.firestoreDatabaseId)
        : getFirestore(fbApp);
      console.log("🔥 Firestore conectado com sucesso no backend Node.js!");
    }
  }
} catch (e) {
  console.warn("Aviso ao conectar Firestore no backend:", e);
}

// Banco de dados em arquivo JSON local para persistência garantida entre reinicializações
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  clientes: any[];
  agendamentos: any[];
  fila: any[];
  historico: any[];
  lavaJatos: any[];
  banners?: any[];
  servicos?: any[];
}

function carregarBanco(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const conteudo = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(conteudo);
      
      // Garante que se houver lista de unidades, não fiquem bloqueadas indevidamente
      if (Array.isArray(parsed.lavaJatos) && parsed.lavaJatos.length > 0) {
        parsed.lavaJatos = parsed.lavaJatos.map((u: any) => ({
          ...u,
          statusPlano: u.statusPlano === 'bloqueado' ? 'ativo' : (u.statusPlano || 'ativo')
        }));
      } else {
        const hoje = new Date();
        const expiracao = new Date();
        expiracao.setDate(hoje.getDate() + 365);
        parsed.lavaJatos = [
          {
            id: 'pitstop',
            nomeFantasia: 'Pit Stop Lava Jato',
            nomeProprietario: 'Carlos Silva',
            razaoSocial: 'C. Silva Lavagens LTDA',
            cnpj: '12.345.678/0001-99',
            endereco: 'Av. Central, 1500 - Centro',
            contato: '(11) 99999-8888',
            senhaProvisoria: 'pit123',
            valorPlano: 149.90,
            dataCriacao: hoje.toLocaleDateString('pt-BR'),
            dataExpiracao: expiracao.toLocaleDateString('pt-BR'),
            statusPlano: 'ativo'
          }
        ];
      }

      if (!Array.isArray(parsed.banners)) {
        parsed.banners = [];
      }

      if (!Array.isArray(parsed.servicos) || parsed.servicos.length === 0) {
        parsed.servicos = [
          { id: 'srv_1', nome: 'Lavagem Simples', valor: 40.00, tempoMedioMinutos: 35, categoria: 'Lavagem', descricao: 'Ducha externa de alta pressão, shampoo neutro e secagem.', ativo: true, unidadeId: 'pitstop' },
          { id: 'srv_2', nome: 'Lavagem Completa', valor: 65.00, tempoMedioMinutos: 50, categoria: 'Lavagem', descricao: 'Lavagem externa + aspiração interna detalhada, painel e pneus.', ativo: true, unidadeId: 'pitstop' },
          { id: 'srv_3', nome: 'Lavagem Completa + Cera Líquida', valor: 85.00, tempoMedioMinutos: 60, categoria: 'Lavagem', descricao: 'Lavagem completa com aplicação de cera carnaúba.', ativo: true, unidadeId: 'pitstop' },
          { id: 'srv_4', nome: 'Higienização Interna dos Bancos', valor: 160.00, tempoMedioMinutos: 120, categoria: 'Higienização', descricao: 'Higienização profunda dos estofados com extração.', ativo: true, unidadeId: 'pitstop' },
          { id: 'srv_5', nome: 'Polimento Técnico Cristalizado', valor: 280.00, tempoMedioMinutos: 180, categoria: 'Estética', descricao: 'Eliminação de micro-riscos e selante de alto brilho.', ativo: true, unidadeId: 'pitstop' },
          { id: 'srv_6', nome: 'Lavagem de Motor e Chassi', valor: 90.00, tempoMedioMinutos: 45, categoria: 'Lavagem', descricao: 'Desengraxe técnico e proteção de motor.', ativo: true, unidadeId: 'pitstop' }
        ];
      }

      return parsed;
    }
  } catch (err) {
    console.warn("Erro ao ler banco local, iniciando padrão:", err);
  }

  const hoje = new Date();
  const expiracao = new Date();
  expiracao.setDate(hoje.getDate() + 365);

  const inicial: DatabaseSchema = {
    clientes: [],
    agendamentos: [],
    fila: [],
    historico: [],
    banners: [],
    lavaJatos: [
      {
        id: 'pitstop',
        nomeFantasia: 'Pit Stop Lava Jato',
        nomeProprietario: 'Carlos Silva',
        razaoSocial: 'C. Silva Lavagens LTDA',
        cnpj: '12.345.678/0001-99',
        endereco: 'Av. Central, 1500 - Centro',
        contato: '(11) 99999-8888',
        senhaProvisoria: 'pit123',
        valorPlano: 149.90,
        dataCriacao: hoje.toLocaleDateString('pt-BR'),
        dataExpiracao: expiracao.toLocaleDateString('pt-BR'),
        statusPlano: 'ativo'
      }
    ]
  };
  salvarBanco(inicial);
  return inicial;
}

function salvarBanco(dados: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao persistir banco de dados:", err);
  }
}

let dbMemory = carregarBanco();

// ============================================================================
// ROTAS DE API PARA SINCRONIZAÇÃO EM TEMPO REAL (MOBILE <-> NOTEBOOK)
// ============================================================================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    timestamp: new Date().toISOString(),
    totalClientes: dbMemory.clientes.length,
    totalAgendamentos: dbMemory.agendamentos.length
  });
});

// --- CLIENTES ---
app.get("/api/clientes", (req, res) => {
  const unidadeId = req.query.unidadeId ? String(req.query.unidadeId).toLowerCase() : null;
  if (unidadeId) {
    const filtrados = dbMemory.clientes.filter(c => {
      const u = String(c.unidadeVinculadaId || c.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    return res.json(filtrados);
  }
  res.json(dbMemory.clientes);
});

app.post("/api/clientes", (req, res) => {
  const novoCliente = req.body;
  if (!novoCliente.nome || !novoCliente.email) {
    return res.status(400).json({ error: "Nome e e-mail são obrigatórios" });
  }

  const id = novoCliente.id || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // Garante que novos clientes sempre iniciem com exatamente 0 pontos
  const clienteFormatado = {
    ...novoCliente,
    id,
    pontos: typeof novoCliente.pontos === 'number' ? novoCliente.pontos : 0,
    pontosFidelidade: typeof novoCliente.pontosFidelidade === 'number' ? novoCliente.pontosFidelidade : 0,
    updatedAt: new Date().toISOString(),
    createdAt: novoCliente.createdAt || new Date().toISOString()
  };

  const index = dbMemory.clientes.findIndex(c => 
    (c.id && c.id === id) || 
    (c.email && c.email.toLowerCase() === clienteFormatado.email.toLowerCase() && 
     String(c.unidadeVinculadaId || '').toLowerCase() === String(clienteFormatado.unidadeVinculadaId || '').toLowerCase())
  );

  if (index >= 0) {
    // Atualiza cliente existente preservando pontos existentes se não fornecidos
    dbMemory.clientes[index] = {
      ...dbMemory.clientes[index],
      ...clienteFormatado,
      pontos: clienteFormatado.pontos !== undefined ? clienteFormatado.pontos : dbMemory.clientes[index].pontos,
      pontosFidelidade: clienteFormatado.pontosFidelidade !== undefined ? clienteFormatado.pontosFidelidade : dbMemory.clientes[index].pontosFidelidade
    };
  } else {
    dbMemory.clientes.unshift(clienteFormatado);
  }

  salvarBanco(dbMemory);
  res.status(201).json(clienteFormatado);
});

// Atualizar pontos do cliente (Apenas o Administrador)
app.patch("/api/clientes/:id/pontos", (req, res) => {
  const { id } = req.params;
  const { pontos } = req.body;

  if (typeof pontos !== 'number') {
    return res.status(400).json({ error: "Valor de pontos inválido" });
  }

  const index = dbMemory.clientes.findIndex(c => c.id === id || c.email === id);
  if (index >= 0) {
    dbMemory.clientes[index].pontos = pontos;
    dbMemory.clientes[index].pontosFidelidade = pontos;
    dbMemory.clientes[index].updatedAt = new Date().toISOString();
    salvarBanco(dbMemory);
    return res.json(dbMemory.clientes[index]);
  }

  res.status(404).json({ error: "Cliente não encontrado" });
});

app.delete("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  dbMemory.clientes = dbMemory.clientes.filter(c => c.id !== id && c.email !== id);
  salvarBanco(dbMemory);
  res.json({ success: true });
});

// --- AGENDAMENTOS ---
app.get("/api/agendamentos", (req, res) => {
  const unidadeId = req.query.unidadeId ? String(req.query.unidadeId).toLowerCase() : null;
  if (unidadeId) {
    const filtrados = dbMemory.agendamentos.filter(a => {
      const u = String(a.unidadeId || a.unidadeVinculadaId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    return res.json(filtrados);
  }
  res.json(dbMemory.agendamentos);
});

app.post("/api/agendamentos", (req, res) => {
  const novo = req.body;
  const id = novo.id || `ag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const itemFormatado = {
    ...novo,
    id,
    status: novo.status || 'Pendente',
    createdAt: novo.createdAt || new Date().toISOString()
  };

  const index = dbMemory.agendamentos.findIndex(a => a.id === id);
  if (index >= 0) {
    dbMemory.agendamentos[index] = { ...dbMemory.agendamentos[index], ...itemFormatado };
  } else {
    dbMemory.agendamentos.unshift(itemFormatado);
  }

  salvarBanco(dbMemory);

  if (serverDb) {
    setDoc(doc(serverDb, "agendamentos", id), itemFormatado).catch((err: any) => 
      console.warn("Aviso ao sincronizar agendamento no Firestore (server):", err)
    );
  }

  res.status(201).json(itemFormatado);
});

app.patch("/api/agendamentos/:id", (req, res) => {
  const { id } = req.params;
  const index = dbMemory.agendamentos.findIndex(a => a.id === id);
  if (index >= 0) {
    dbMemory.agendamentos[index] = {
      ...dbMemory.agendamentos[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    salvarBanco(dbMemory);

    if (serverDb) {
      setDoc(doc(serverDb, "agendamentos", id), dbMemory.agendamentos[index], { merge: true }).catch(() => {});
    }

    return res.json(dbMemory.agendamentos[index]);
  }
  res.status(404).json({ error: "Agendamento não encontrado" });
});

app.delete("/api/agendamentos/:id", (req, res) => {
  const { id } = req.params;
  dbMemory.agendamentos = dbMemory.agendamentos.filter(a => a.id !== id);
  salvarBanco(dbMemory);

  if (serverDb) {
    deleteDoc(doc(serverDb, "agendamentos", id)).catch(() => {});
  }

  res.json({ success: true });
});

// --- FILA OPERACIONAL ---
app.get("/api/fila", (req, res) => {
  const unidadeId = req.query.unidadeId ? String(req.query.unidadeId).toLowerCase() : null;
  if (unidadeId) {
    const filtrados = dbMemory.fila.filter(f => {
      const u = String(f.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    return res.json(filtrados);
  }
  res.json(dbMemory.fila);
});

app.post("/api/fila", (req, res) => {
  const item = req.body;
  const id = item.id || `fila_${Date.now()}`;
  const formatado = { ...item, id };
  const idx = dbMemory.fila.findIndex(f => f.id === id);
  if (idx >= 0) {
    dbMemory.fila[idx] = formatado;
  } else {
    dbMemory.fila.unshift(formatado);
  }
  salvarBanco(dbMemory);
  res.status(201).json(formatado);
});

app.delete("/api/fila/:id", (req, res) => {
  const { id } = req.params;
  dbMemory.fila = dbMemory.fila.filter(f => f.id !== id);
  salvarBanco(dbMemory);
  res.json({ success: true });
});

// --- UNIDADES / LAVA-JATOS (SaaS) ---
app.get("/api/unidades", (_req, res) => {
  res.json(dbMemory.lavaJatos);
});

app.post("/api/unidades", (req, res) => {
  const novaUnidade = req.body;
  if (!novaUnidade.nomeFantasia || !novaUnidade.id) {
    return res.status(400).json({ error: "Nome Fantasia e ID são obrigatórios" });
  }

  const formatada = {
    ...novaUnidade,
    statusPlano: novaUnidade.statusPlano || 'ativo',
    updatedAt: new Date().toISOString()
  };

  const idx = dbMemory.lavaJatos.findIndex(u => u.id === formatada.id);
  if (idx >= 0) {
    dbMemory.lavaJatos[idx] = { ...dbMemory.lavaJatos[idx], ...formatada };
  } else {
    dbMemory.lavaJatos.unshift(formatada);
  }

  salvarBanco(dbMemory);
  res.status(201).json(formatada);
});

app.patch("/api/unidades/:id", (req, res) => {
  const { id } = req.params;
  const idx = dbMemory.lavaJatos.findIndex(u => u.id === id);
  if (idx >= 0) {
    dbMemory.lavaJatos[idx] = {
      ...dbMemory.lavaJatos[idx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    salvarBanco(dbMemory);
    return res.json(dbMemory.lavaJatos[idx]);
  }
  res.status(404).json({ error: "Unidade não encontrada" });
});

app.delete("/api/unidades/:id", (req, res) => {
  const { id } = req.params;
  dbMemory.lavaJatos = dbMemory.lavaJatos.filter(u => u.id !== id);
  salvarBanco(dbMemory);
  res.json({ success: true });
});

// --- BANNERS PROMOCIONAIS ---
app.get("/api/banners", (req, res) => {
  const unidadeId = req.query.unidadeId ? String(req.query.unidadeId).toLowerCase() : null;
  const lista = dbMemory.banners || [];
  if (unidadeId) {
    const filtrados = lista.filter((b: any) => {
      const u = String(b.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    return res.json(filtrados);
  }
  res.json(lista);
});

app.post("/api/banners", (req, res) => {
  const novo = req.body;
  const id = novo.id || `banner_${Date.now()}`;
  const formatado = {
    ...novo,
    id,
    status: novo.status || 'Ativo',
    createdAt: novo.createdAt || new Date().toISOString()
  };

  if (!Array.isArray(dbMemory.banners)) {
    dbMemory.banners = [];
  }

  const idx = dbMemory.banners.findIndex((b: any) => b.id === id);
  if (idx >= 0) {
    dbMemory.banners[idx] = { ...dbMemory.banners[idx], ...formatado };
  } else {
    dbMemory.banners.unshift(formatado);
  }

  salvarBanco(dbMemory);
  res.status(201).json(formatado);
});

app.patch("/api/banners/:id", (req, res) => {
  const { id } = req.params;
  if (!Array.isArray(dbMemory.banners)) dbMemory.banners = [];
  const idx = dbMemory.banners.findIndex((b: any) => b.id === id);
  if (idx >= 0) {
    dbMemory.banners[idx] = {
      ...dbMemory.banners[idx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    salvarBanco(dbMemory);
    return res.json(dbMemory.banners[idx]);
  }
  res.status(404).json({ error: "Banner não encontrado" });
});

app.delete("/api/banners/:id", (req, res) => {
  const { id } = req.params;
  if (!Array.isArray(dbMemory.banners)) dbMemory.banners = [];
  dbMemory.banners = dbMemory.banners.filter((b: any) => b.id !== id);
  salvarBanco(dbMemory);
  res.json({ success: true });
});

// --- SERVIÇOS & VALORES DO LAVA-JATO ---
app.get("/api/servicos", (req, res) => {
  const unidadeId = req.query.unidadeId ? String(req.query.unidadeId).toLowerCase() : null;
  const lista = dbMemory.servicos || [];
  if (unidadeId) {
    const filtrados = lista.filter((s: any) => {
      const u = String(s.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    return res.json(filtrados);
  }
  res.json(lista);
});

app.post("/api/servicos", (req, res) => {
  const novo = req.body;
  if (!novo.nome || novo.valor === undefined) {
    return res.status(400).json({ error: "Nome e valor são obrigatórios" });
  }

  const id = novo.id || `srv_${Date.now()}`;
  const formatado = {
    ...novo,
    id,
    valor: Number(novo.valor) || 0,
    tempoMedioMinutos: novo.tempoMedioMinutos ? Number(novo.tempoMedioMinutos) : 45,
    categoria: novo.categoria || 'Lavagem',
    ativo: novo.ativo !== undefined ? Boolean(novo.ativo) : true,
    createdAt: novo.createdAt || new Date().toISOString()
  };

  if (!Array.isArray(dbMemory.servicos)) dbMemory.servicos = [];
  const idx = dbMemory.servicos.findIndex((s: any) => s.id === id);
  if (idx >= 0) {
    dbMemory.servicos[idx] = { ...dbMemory.servicos[idx], ...formatado };
  } else {
    dbMemory.servicos.unshift(formatado);
  }

  salvarBanco(dbMemory);

  if (serverDb) {
    setDoc(doc(serverDb, "servicos", id), formatado).catch(() => {});
  }

  res.status(201).json(formatado);
});

app.patch("/api/servicos/:id", (req, res) => {
  const { id } = req.params;
  if (!Array.isArray(dbMemory.servicos)) dbMemory.servicos = [];
  const idx = dbMemory.servicos.findIndex((s: any) => s.id === id);
  if (idx >= 0) {
    dbMemory.servicos[idx] = {
      ...dbMemory.servicos[idx],
      ...req.body,
      valor: req.body.valor !== undefined ? Number(req.body.valor) : dbMemory.servicos[idx].valor,
      updatedAt: new Date().toISOString()
    };
    salvarBanco(dbMemory);

    if (serverDb) {
      setDoc(doc(serverDb, "servicos", id), dbMemory.servicos[idx], { merge: true }).catch(() => {});
    }

    return res.json(dbMemory.servicos[idx]);
  }
  res.status(404).json({ error: "Serviço não encontrado" });
});

app.delete("/api/servicos/:id", (req, res) => {
  const { id } = req.params;
  if (!Array.isArray(dbMemory.servicos)) dbMemory.servicos = [];
  dbMemory.servicos = dbMemory.servicos.filter((s: any) => s.id !== id);
  salvarBanco(dbMemory);

  if (serverDb) {
    deleteDoc(doc(serverDb, "servicos", id)).catch(() => {});
  }

  res.json({ success: true });
});

// --- STATUS GERAL DE SINCRONIZAÇÃO ---
app.get("/api/sync", (req, res) => {
  const unidadeId = req.query.unidadeId ? String(req.query.unidadeId).toLowerCase() : null;
  let clientes = dbMemory.clientes;
  let agendamentos = dbMemory.agendamentos;
  let fila = dbMemory.fila;
  let unidades = dbMemory.lavaJatos;
  let banners = dbMemory.banners || [];
  let servicos = dbMemory.servicos || [];

  if (unidadeId) {
    clientes = clientes.filter(c => {
      const u = String(c.unidadeVinculadaId || c.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    agendamentos = agendamentos.filter(a => {
      const u = String(a.unidadeId || a.unidadeVinculadaId || a.unidadeSlug || a.unidadeNome || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    fila = fila.filter(f => {
      const u = String(f.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    banners = banners.filter((b: any) => {
      const u = String(b.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
    servicos = servicos.filter((s: any) => {
      const u = String(s.unidadeId || '').toLowerCase();
      return !u || u === unidadeId || u.includes(unidadeId) || unidadeId.includes(u);
    });
  }

  res.json({
    timestamp: Date.now(),
    clientes,
    agendamentos,
    fila,
    unidades,
    banners,
    servicos
  });
});

// ============================================================================
// VITE MIDDLEWARE & SERVIÇO DE ARQUIVOS ESTÁTICOS
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 HubWash Server rodando perfeitamente na porta ${PORT}`);
  });
}

startServer();
