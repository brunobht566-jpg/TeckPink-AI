const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "100kb" }));

async function consultarOpenAI(pergunta) {
    const chave = process.env.OPENAI_API_KEY;
    if (!chave) throw new Error("OPENAI_API_KEY não configurada.");

    const response = await fetch(process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${chave}`
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [{ role: "user", content: pergunta }]
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Erro OpenAI (${response.status})`);
    return data.choices?.[0]?.message?.content || "Sem resposta.";
}

async function consultarGemini(pergunta) {
    const chave = process.env.GEMINI_API_KEY;
    if (!chave) throw new Error("GEMINI_API_KEY não configurada.");

    const modelo = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(chave)}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: pergunta }] }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Erro Gemini (${response.status})`);
    return data.candidates?.[0]?.content?.parts?.map((parte) => parte.text).join("\n") || "Sem resposta.";
}

async function consultarMeta(pergunta) {
    const chave = process.env.META_AI_API_KEY;
    if (!chave) throw new Error("META_AI_API_KEY não configurada.");

    const response = await fetch(process.env.META_AI_API_URL || "https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${chave}`
        },
        body: JSON.stringify({
            model: process.env.META_AI_MODEL || "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: pergunta }]
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Erro Meta AI/Llama (${response.status})`);
    return data.choices?.[0]?.message?.content || "Sem resposta.";
}

function resultadoSeguro(promise) {
    return promise
        .then((texto) => ({ ok: true, texto }))
        .catch((erro) => ({ ok: false, texto: erro.message }));
}

function servirArquivo(nome) {
    return (req, res, next) => {
        res.sendFile(path.join(__dirname, nome), (erro) => {
            if (erro) next(erro);
        });
    };
}

app.get("/api/status", (req, res) => {
    res.json({
        projeto: "TeckPink AI",
        status: "Servidor funcionando!",
        versao: "1.0"
    });
});

app.post("/api/chat", async (req, res, next) => {
    try {
        const { pergunta } = req.body;
        if (!pergunta || typeof pergunta !== "string" || !pergunta.trim()) {
            res.status(400).json({ erro: "Digite uma pergunta." });
            return;
        }

        const texto = pergunta.trim();
        const [openai, gemini, meta] = await Promise.all([
            resultadoSeguro(consultarOpenAI(texto)),
            resultadoSeguro(consultarGemini(texto)),
            resultadoSeguro(consultarMeta(texto))
        ]);
        res.json({ openai, gemini, meta });
    } catch (erro) {
        next(erro);
    }
});

app.get("/", servirArquivo("index.html"));
app.get("/styles.css", servirArquivo("styles.css"));
app.get("/script.js", servirArquivo("script.js"));

app.use((req, res) => {
    if (req.method !== "GET") {
        res.status(405).send("Método não permitido");
        return;
    }
    res.status(404).send("Arquivo não encontrado");
});

app.use((erro, req, res, next) => {
    if (res.headersSent) {
        next(erro);
        return;
    }
    const status = erro.status || 500;
    res.status(status).json({
        erro: status === 413 ? "Requisição muito grande." : erro.message
    });
});

app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("TECKPINK AI");
    console.log("Servidor iniciado com sucesso!");
    console.log(`http://localhost:${PORT}`);
    console.log("--------------------------------");
});
