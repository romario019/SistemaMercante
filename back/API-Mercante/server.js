const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// SERVE A PASTA DIST DO FRONTEND WEB
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// --- CONFIGURAÇÃO DE CAMINHOS ---
const NETWORK_DIR = "\\\\10.77.1.10\\Departamentos\\Melhoria Continua\\Banco de Dados de Software\\Checklist";
const DB_PATH = path.join(NETWORK_DIR, 'mercante_dados.sqlite');
const PHOTOS_DIR = path.join(NETWORK_DIR, 'Fotos');
const POWERBI_DIR = path.join(NETWORK_DIR, 'Bases_PowerBI');

if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
if (!fs.existsSync(POWERBI_DIR)) fs.mkdirSync(POWERBI_DIR, { recursive: true });

// --- CONEXÃO COM O BANCO SQLITE ---
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("❌ Erro ao conectar no SQLite:", err.message);
    else {
        console.log("✅ Conectado ao banco de dados SQLite!");
        createTables();
    }
});

// --- CRIAÇÃO DAS TABELAS ---
function createTables() {
    const colunasPadrao = `id_relatorio TEXT PRIMARY KEY, data_hora TEXT, operador TEXT, equipamento TEXT, id_especifico TEXT, respostas_json TEXT, caminho_fotos TEXT`;

    const tabelas = [
        "resp_emp_combustao", "resp_emp_eletrica", "resp_transpaleteira", 
        "resp_paleteira", "resp_coletores", "resp_5s_deposito", 
        "resp_5s_office", "resp_5s_patio", "resp_geral"
    ];

    tabelas.forEach(tab => {
        db.run(`CREATE TABLE IF NOT EXISTS ${tab} (${colunasPadrao})`);
    });

    // 👇 NOVA TABELA DE USUÁRIOS 👇
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT UNIQUE, 
        password TEXT, 
        role TEXT
    )`, () => {
        // Cria o usuário SuperAdmin padrão se a tabela estiver vazia
        db.get("SELECT COUNT(*) as count FROM usuarios", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO usuarios (username, password, role) VALUES ('nicolas.admin', '123456', 'SuperAdmin')");
                console.log("👑 Usuário Master criado: nicolas.admin / Senha: 123456");
            }
        });
    });

    console.log("📊 Tabelas e Sistema de Usuários preparados.");
}

// --- ROTAS DE USUÁRIO E LOGIN ---

// 1. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT id, username, role FROM usuarios WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        if (!user) return res.status(401).json({ status: "error", message: "Usuário ou senha incorretos" });
        res.json({ status: "success", user });
    });
});

// 2. Listar Usuários (Oculta senhas)
app.get('/api/usuarios', (req, res) => {
    db.all("SELECT id, username, role FROM usuarios ORDER BY role, username", [], (err, rows) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        res.json(rows);
    });
});

// 3. Criar Usuário (Com validação rigorosa de hierarquia)
app.post('/api/usuarios', (req, res) => {
    const { username, password, role, creatorRole } = req.body;

    // Regra de Ouro: Por padrão, força a ser Operador
    let finalRole = 'Operador';
    
    // Apenas o SuperAdmin tem autorização para definir cargos superiores
    if (creatorRole === 'SuperAdmin') {
        finalRole = role; 
    } 

    db.run("INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)", [username.trim(), password.trim(), finalRole], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE")) return res.status(400).json({ status: "error", message: "Nome de usuário já existe!" });
            return res.status(500).json({ status: "error", message: err.message });
        }
        res.json({ status: "success", message: "Usuário criado com sucesso!" });
    });
});

// 4. Editar/Atualizar Usuário (Controlo de permissões corrigido)
app.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { username, password, role, creatorRole } = req.body;

    db.get("SELECT role FROM usuarios WHERE id = ?", [id], (err, targetUser) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        if (!targetUser) return res.status(404).json({ status: "error", message: "Usuário não encontrado." });

        // Se a conta alvo for SuperAdmin e quem edita não for SuperAdmin, bloqueia imediatamente
        if (targetUser.role === 'SuperAdmin' && creatorRole !== 'SuperAdmin') {
            return res.status(403).json({ status: "error", message: "Acesso negado." });
        }

        // Define o cargo final com base em quem está a editar
        let finalRole = targetUser.role; // Mantém o atual por segurança
        if (creatorRole === 'SuperAdmin') {
            finalRole = role; // SuperAdmin pode alterar para qualquer cargo
        }

        let query;
        let params;
        if (password && password.trim() !== "") {
            query = "UPDATE usuarios SET username = ?, password = ?, role = ? WHERE id = ?";
            params = [username.trim(), password.trim(), finalRole, id];
        } else {
            query = "UPDATE usuarios SET username = ?, role = ? WHERE id = ?";
            params = [username.trim(), finalRole, id];
        }

        db.run(query, params, function(err) {
            if (err) {
                if (err.message.includes("UNIQUE")) return res.status(400).json({ status: "error", message: "Este nome de usuário já está em uso!" });
                return res.status(500).json({ status: "error", message: err.message });
            }
            res.json({ status: "success", message: "Usuário atualizado com sucesso!" });
        });
    });
});

// 5. Excluir Usuário (Com validação de hierarquia)
app.delete('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { creatorRole } = req.body; 

    db.get("SELECT role FROM usuarios WHERE id = ?", [id], (err, targetUser) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        if (!targetUser) return res.status(404).json({ status: "error", message: "Usuário não encontrado." });

        // Regra de segurança: Apenas SuperAdmin apaga contas SuperAdmin
        if (targetUser.role === 'SuperAdmin' && creatorRole !== 'SuperAdmin') {
            return res.status(403).json({ status: "error", message: "Permissão negada para excluir um SuperAdmin." });
        }

        db.run("DELETE FROM usuarios WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ status: "error", message: err.message });
            res.json({ status: "success", message: "Usuário excluído com sucesso!" });
        });
    });
});

// 6. Alterar a própria senha (ROTA CORRIGIDA PARA EVITAR CONFLITOS)
app.put('/api/mudar-minha-senha', (req, res) => {
    const { username, currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ status: "error", message: "Todos os campos são obrigatórios." });
    }

    const safeUsername = username.trim().toLowerCase();

    db.get("SELECT id, password FROM usuarios WHERE LOWER(TRIM(username)) = ?", [safeUsername], (err, user) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        
        if (!user) {
            return res.status(404).json({ status: "error", message: "Sessão inválida. Usuário não encontrado no banco." });
        }

        if (user.password !== currentPassword.trim()) {
            return res.status(401).json({ status: "error", message: "A Senha Atual digitada está incorreta." });
        }

        db.run("UPDATE usuarios SET password = ? WHERE id = ?", [newPassword.trim(), user.id], function(updateErr) {
            if (updateErr) return res.status(500).json({ status: "error", message: updateErr.message });
            
            res.json({ status: "success", message: "Senha atualizada com sucesso!" });
        });
    });
});

// 7. Excluir Relatório (RESET DE TURNO)
app.delete('/api/relatorios/:id', (req, res) => {
    const { id } = req.params;
    
    // Lista de todas as tabelas onde o relatório pode estar
    const tabelas = [
        "resp_emp_combustao", "resp_emp_eletrica", "resp_transpaleteira", 
        "resp_paleteira", "resp_coletores", "resp_5s_deposito", 
        "resp_5s_office", "resp_5s_patio", "resp_geral"
    ];

    // Cria uma query UNION ALL para procurar o ID em todas as tabelas ao mesmo tempo
    const queries = tabelas.map(tab => `SELECT '${tab}' as tabela, caminho_fotos FROM ${tab} WHERE id_relatorio = ?`);
    const queryFinal = queries.join(' UNION ALL ');
    
    // Cria um array com o ID repetido para cada tabela na query
    const params = Array(tabelas.length).fill(id);

    // Passo 1: Localiza a tabela e as fotos associadas
    db.get(queryFinal, params, (err, row) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        if (!row) return res.status(404).json({ status: "error", message: "Relatório não encontrado no banco de dados." });

        const tabelaDestino = row.tabela;
        const caminhosFotos = row.caminho_fotos ? row.caminho_fotos.split(';') : [];

        // Passo 2: Apaga do Banco de Dados SQL
        db.run(`DELETE FROM ${tabelaDestino} WHERE id_relatorio = ?`, [id], function(delErr) {
            if (delErr) return res.status(500).json({ status: "error", message: delErr.message });

            // Passo 3: Apaga as fotos físicas da pasta de rede para não ocupar espaço fantasma
            caminhosFotos.forEach(fotoPath => {
                if (fotoPath && fs.existsSync(fotoPath)) {
                    try {
                        fs.unlinkSync(fotoPath);
                    } catch(e) {
                        console.error(`Aviso: Erro ao apagar foto física: ${fotoPath}`, e);
                    }
                }
            });

            console.log(`🗑️ Relatório ${id} apagado da tabela ${tabelaDestino}.`);
            res.json({ status: "success", message: "Relatório apagado. Equipamento liberado para o turno." });
        });
    });
});

// --- ROTAS DO CHECKLIST (MANTIDAS IGUAIS) ---
// --- ROTAS DO CHECKLIST ---
app.get('/api/config', (req, res) => {
    try {
        const configData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
        
        // Busca os últimos registros no banco para bloquear itens já feitos no turno
        const tabelas = [
            { nome: "resp_emp_combustao", tipo: "general" },
            { nome: "resp_emp_eletrica", tipo: "general" },
            { nome: "resp_transpaleteira", tipo: "general" },
            { nome: "resp_paleteira", tipo: "general" },
            { nome: "resp_coletores", tipo: "collectors" },
            { nome: "resp_5s_deposito", tipo: "s5" },
            { nome: "resp_5s_office", tipo: "s5" },
            { nome: "resp_5s_patio", tipo: "s5" }
        ];

        const queries = tabelas.map(t => `SELECT '${t.tipo}' as categoria, equipamento, id_especifico, data_hora FROM ${t.nome}`);
        const queryFinal = `${queries.join(' UNION ALL ')} ORDER BY data_hora DESC LIMIT 300`;

        db.all(queryFinal, [], (err, rows) => {
            let completed = { general: [], collectors: [], s5: [] };
            
            if (!err && rows) {
                // Função para saber de qual turno é a data de cada relatório no banco
                const getShift = (dataHoraStr) => {
                    if(!dataHoraStr) return "";
                    const [date, time] = dataHoraStr.split(' ');
                    const [day, month, year] = date.split('/');
                    const [hour, minute] = time.split(':');
                    const h = parseInt(hour, 10);
                    let d = new Date(year, month - 1, day);
                    if (h < 8) d.setDate(d.getDate() - 1);
                    const pDay = String(d.getDate()).padStart(2, "0");
                    const pMonth = String(d.getMonth() + 1).padStart(2, "0");
                    const isNight = h >= 18 || h < 8; // Noturno: 18h em diante ou antes das 08h
                    return `${pDay}/${pMonth}/${d.getFullYear()}_${isNight ? "NOTURNO" : "DIURNO"}`;
                };

                // Pega o turno exato de AGORA no relógio do servidor
                const now = new Date();
                const hNow = now.getHours();
                let dNow = new Date(now);
                if (hNow < 8) dNow.setDate(dNow.getDate() - 1);
                const pDayNow = String(dNow.getDate()).padStart(2, "0");
                const pMonthNow = String(dNow.getMonth() + 1).padStart(2, "0");
                const isNightNow = hNow >= 18 || hNow < 8;
                const currentShiftServer = `${pDayNow}/${pMonthNow}/${dNow.getFullYear()}_${isNightNow ? "NOTURNO" : "DIURNO"}`;

                // Filtra e separa só o que foi feito no turno atual
                rows.forEach(row => {
                    const rowShift = getShift(row.data_hora);
                    if (rowShift === currentShiftServer) {
                        if (row.categoria === 's5') completed.s5.push(row.id_especifico);
                        else if (row.categoria === 'collectors') completed.collectors.push(row.id_especifico);
                        else completed.general.push(`${row.equipamento}|${row.id_especifico}`);
                    }
                });
            }

            // Envia as configurações + a lista de bloqueios em tempo real
            configData.completedThisShift = completed;
            configData.status = "success";
            res.json(configData);
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: "Erro ao ler configurações." });
    }
});

// --- ROTA POST: SALVAR NOVAS CONFIGURAÇÕES E PERGUNTAS ---
app.post('/api/config', (req, res) => {
    try {
        const novaConfig = req.body;
        
        if (!novaConfig.checklistsData || !novaConfig.data5S) {
            return res.status(400).json({ status: "error", message: "Formato de dados inválido." });
        }

        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(novaConfig, null, 2), 'utf8');
        
        console.log("✅ Arquivo config.json atualizado via Painel Admin!");
        res.json({ status: "success", message: "Perguntas salvas com sucesso!" });
    } catch (err) {
        console.error("❌ Erro ao salvar config.json:", err);
        res.status(500).json({ status: "error", message: "Erro ao salvar o arquivo de configurações." });
    }
});

// --- ROTAS DO CHECKLIST E BLOQUEIO DE TURNO ---
app.get('/api/config', (req, res) => {
    try {
        const configData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
        
        const tabelas = [
            { nome: "resp_emp_combustao", tipo: "general" },
            { nome: "resp_emp_eletrica", tipo: "general" },
            { nome: "resp_transpaleteira", tipo: "general" },
            { nome: "resp_paleteira", tipo: "general" },
            { nome: "resp_coletores", tipo: "collectors" },
            { nome: "resp_5s_deposito", tipo: "s5" },
            { nome: "resp_5s_office", tipo: "s5" },
            { nome: "resp_5s_patio", tipo: "s5" }
        ];

        const queries = tabelas.map(t => `SELECT '${t.tipo}' as categoria, equipamento, id_especifico, data_hora FROM ${t.nome}`);
        
        // 👇 A MÁGICA: O SELECT * FROM () engana o SQLite e permite ordenar as datas perfeitamente 👇
        const queryFinal = `SELECT * FROM (${queries.join(' UNION ALL ')}) ORDER BY substr(data_hora, 7, 4) || '-' || substr(data_hora, 4, 2) || '-' || substr(data_hora, 1, 2) || ' ' || substr(data_hora, 12, 5) DESC LIMIT 300`;

        db.all(queryFinal, [], (err, rows) => {
            let completed = { general: [], collectors: [], s5: [] };
            
            if (!err && rows) {
                const getShift = (dataHoraStr) => {
                    if(!dataHoraStr) return "";
                    const [date, time] = dataHoraStr.split(' ');
                    const [day, month, year] = date.split('/');
                    const [hour, minute] = time.split(':');
                    const h = parseInt(hour, 10);
                    const m = parseInt(minute, 10);
                    let d = new Date(year, month - 1, day);
                    if (h < 8) d.setDate(d.getDate() - 1);
                    const pDay = String(d.getDate()).padStart(2, "0");
                    const pMonth = String(d.getMonth() + 1).padStart(2, "0");
                    
                    const isNight = h > 17 || (h === 17 && m >= 40) || h < 8;
                    return `${pDay}/${pMonth}/${d.getFullYear()}_${isNight ? "NOTURNO" : "DIURNO"}`;
                };

                const now = new Date();
                const hNow = now.getHours();
                const mNow = now.getMinutes();
                let dNow = new Date(now);
                if (hNow < 8) dNow.setDate(dNow.getDate() - 1);
                const pDayNow = String(dNow.getDate()).padStart(2, "0");
                const pMonthNow = String(dNow.getMonth() + 1).padStart(2, "0");
                
                const isNightNow = hNow > 17 || (hNow === 17 && mNow >= 40) || hNow < 8;
                const currentShiftServer = `${pDayNow}/${pMonthNow}/${dNow.getFullYear()}_${isNightNow ? "NOTURNO" : "DIURNO"}`;

                rows.forEach(row => {
                    const rowShift = getShift(row.data_hora);
                    if (rowShift === currentShiftServer) {
                        if (row.categoria === 's5') completed.s5.push(row.id_especifico);
                        else if (row.categoria === 'collectors') completed.collectors.push(row.id_especifico);
                        else completed.general.push(`${row.equipamento}|${row.id_especifico}`);
                    }
                });
            }

            configData.completedThisShift = completed;
            configData.status = "success";
            res.json(configData);
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: "Erro ao ler configurações." });
    }
});

// --- ROTA DE HISTÓRICO ---
app.get('/api/historico', (req, res) => {
    const tabelas = [
        "resp_emp_combustao", "resp_emp_eletrica", "resp_transpaleteira", 
        "resp_paleteira", "resp_coletores", "resp_5s_deposito", 
        "resp_5s_office", "resp_5s_patio", "resp_geral"
    ];

    const queries = tabelas.map(tab => `SELECT id_relatorio, data_hora, operador, equipamento, id_especifico, respostas_json FROM ${tab}`);
    
    // 👇 A MÁGICA SE REPETE: SELECT * FROM () para buscar os últimos 50 relatórios da Nuvem 👇
    const queryFinal = `SELECT * FROM (${queries.join(' UNION ALL ')}) ORDER BY substr(data_hora, 7, 4) || '-' || substr(data_hora, 4, 2) || '-' || substr(data_hora, 1, 2) || ' ' || substr(data_hora, 12, 5) DESC LIMIT 50`;

    db.all(queryFinal, [], (err, rows) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        const historyFormatado = rows.map(row => {
            const [date, time] = row.data_hora.split(' ');
            let responsesObj = {};
            try { responsesObj = JSON.parse(row.respostas_json); } catch (e) {}
            return {
                id: row.id_relatorio, timestamp: row.data_hora, userName: row.operador,
                equipmentTitle: row.equipamento,
                sectorDetail: row.equipamento === "Auditoria 5S" ? row.id_especifico : null,
                collectorNumber: row.equipamento === "Coletores" ? row.id_especifico : null,
                specificId: row.id_especifico, date: date, time: time, responses: responsesObj
            };
        });
        res.json(historyFormatado);
    });
});

app.post('/api/enviar', (req, res) => {
    const data = req.body;
    let fotosSalvas = [];
    try {
        if (data.photosBase64 && Array.isArray(data.photosBase64)) {
            data.photosBase64.forEach((base64String, index) => {
                const base64Data = base64String.replace(/^data:image\/jpeg;base64,/, "");
                const filePath = path.join(PHOTOS_DIR, `${data.id}_foto${index + 1}.jpg`);
                fs.writeFileSync(filePath, base64Data, 'base64');
                fotosSalvas.push(filePath);
            });
        }

        let tabelaDestino = "resp_geral";
        const tagLocal = data.specificId || data.sectorDetail || "-";

        if (data.equipmentTitle === "Empilhadeira a Combustão") tabelaDestino = "resp_emp_combustao";
        else if (data.equipmentTitle === "Empilhadeira Elétrica") tabelaDestino = "resp_emp_eletrica";
        else if (data.equipmentTitle === "Transpaleteira") tabelaDestino = "resp_transpaleteira";
        else if (data.equipmentTitle === "Paleteira") tabelaDestino = "resp_paleteira";
        else if (data.equipmentTitle === "Coletores") tabelaDestino = "resp_coletores";
        else if (data.equipmentTitle === "Auditoria 5S") {
            const configData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
            const tagUpper = tagLocal.toUpperCase();
            
            // Verifica se começa com RUA/DOCA ou se é um setor normal do Depósito
            if (tagUpper.startsWith("RUA") || tagUpper.startsWith("DOCA") || configData.data5S.sectors.DEPOSITO.some(s => s.tag === tagLocal)) {
                tabelaDestino = "resp_5s_deposito";
            }
            else if (configData.data5S.sectors.OFFICE.some(s => s.tag === tagLocal)) {
                tabelaDestino = "resp_5s_office";
            }
            else if (configData.data5S.sectors.PÁTIO.some(s => s.tag === tagLocal)) {
                tabelaDestino = "resp_5s_patio";
            }
        }

        const jsonRespostas = JSON.stringify(data.responses);
        const query = `INSERT INTO ${tabelaDestino} (id_relatorio, data_hora, operador, equipamento, id_especifico, respostas_json, caminho_fotos) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const values = [data.id, `${data.date} ${data.time}`, data.userName, data.equipmentTitle, tagLocal, jsonRespostas, fotosSalvas.join(';')];

        db.run(query, values, function(err) {
            if (err) return res.status(500).json({ status: "error", message: err.message });
            
            const csvPath = path.join(POWERBI_DIR, `${tabelaDestino}.csv`);
            const jsonSafe = jsonRespostas.replace(/"/g, '""'); 
            const csvLine = `"${data.id}","${data.date} ${data.time}","${data.userName}","${data.equipmentTitle}","${tagLocal}","${jsonSafe}","${fotosSalvas.join(';')}"\n`;

            if (!fs.existsSync(csvPath)) {
                const header = `"ID","DATA_HORA","OPERADOR","EQUIPAMENTO","LOCAL_OU_ID","RESPOSTAS_JSON","FOTOS"\n`;
                fs.writeFileSync(csvPath, header + csvLine, 'utf8');
            } else {
                fs.appendFileSync(csvPath, csvLine, 'utf8');
            }
            res.json({ status: "success" });
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// ROTA CURINGA PARA NAVEGAÇÃO WEB
app.get(/(.*)/, (req, res) => {
    if (fs.existsSync(distPath)) res.sendFile(path.join(distPath, 'index.html'));
    else res.status(404).send("Site não encontrado.");
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor rodando livremente na porta ${PORT}`));