const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path'); // Módulo para lidar com pastas

const app = express();
// NA NUVEM, a porta é dada pelo sistema, senão usa a 3000
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());
// SERVE OS ARQUIVOS HTML DA PASTA PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// --- SEUS DADOS E BANCO (Mantenha igual) ---
const horariosFixos = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const db = new sqlite3.Database('./barbearia.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT, whatsapp TEXT, servico TEXT, bairro TEXT, data TEXT, hora TEXT
    )`);
});

// --- ROTAS (Mantenha as mesmas lógicas) ---

// Rota Principal (quando entra no site, manda o index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota Admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/horarios/:data', (req, res) => {
    const data = req.params.data;
    db.all("SELECT hora FROM agendamentos WHERE data = ?", [data], (err, rows) => {
        if (err) return res.status(400).json({ erro: err.message });
        const ocupados = rows.map(r => r.hora);
        const livres = horariosFixos.filter(h => !ocupados.includes(h));
        res.json(livres);
    });
});

app.post('/agendar', (req, res) => {
    const { nome, whatsapp, servico, bairro, data, hora } = req.body;
    db.get("SELECT id FROM agendamentos WHERE data = ? AND hora = ?", [data, hora], (err, row) => {
        if (row) return res.status(400).json({ erro: "Ocupado" });
        db.run(`INSERT INTO agendamentos (nome, whatsapp, servico, bairro, data, hora) VALUES (?, ?, ?, ?, ?, ?)`, 
            [nome, whatsapp, servico, bairro, data, hora], function(err) {
            if (err) return res.status(400).json({ erro: err.message });
            res.json({ message: "Sucesso", id: this.lastID });
        });
    });
});

app.get('/agendamentos', (req, res) => {
    db.all("SELECT * FROM agendamentos", [], (err, rows) => res.json(rows));
});

app.delete('/agendamento/:id', (req, res) => {
    db.run("DELETE FROM agendamentos WHERE id = ?", req.params.id, (err) => res.json({ deleted: true }));
});

app.get('/estatisticas/bairros', (req, res) => {
    db.all("SELECT bairro, COUNT(*) as total FROM agendamentos GROUP BY bairro", [], (err, rows) => res.json(rows));
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});