
const perguntaInput = document.getElementById("pergunta");
const consultarBotao = document.getElementById("consultar");
const novaConversaBotao = document.getElementById("novaConversa");
const limparHistoricoBotao = document.getElementById("limparHistorico");
const listaHistorico = document.getElementById("listaHistorico");
const conversaElemento = document.getElementById("conversa");
const chaveHistorico = "historicoTeckPink";
let historico = carregarHistorico();

function carregarHistorico() {
    try {
        const salvo = JSON.parse(localStorage.getItem(chaveHistorico) || "[]");
        return Array.isArray(salvo) ? salvo : [];
    } catch {
        return [];
    }
}

function mostrarHistorico() {
    listaHistorico.replaceChildren();

    if (historico.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhuma conversa salva.";
        listaHistorico.appendChild(vazio);
        return;
    }

    for (const conversa of historico) {
        const item = document.createElement("div");
        item.className = "item-historico";

        const texto = document.createElement("p");
        texto.textContent = conversa.pergunta;

        const data = document.createElement("small");
        data.textContent = conversa.data;

        item.append(texto, data);
        listaHistorico.appendChild(item);
    }
}

function salvarNoHistorico(pergunta) {
    historico.unshift({
        pergunta,
        data: new Date().toLocaleString("pt-BR")
    });
    localStorage.setItem(chaveHistorico, JSON.stringify(historico));
    mostrarHistorico();
}

function adicionarMensagem(nome, texto, tipo) {
    const mensagem = document.createElement("div");
    mensagem.className = `mensagem mensagem-${tipo}`;

    const identificacao = document.createElement("strong");
    identificacao.className = "nome-mensagem";
    identificacao.textContent = nome;

    const conteudo = document.createElement("p");
    conteudo.textContent = texto;

    mensagem.append(identificacao, conteudo);
    conversaElemento.appendChild(mensagem);
    conversaElemento.scrollTop = conversaElemento.scrollHeight;
    return { mensagem, conteudo };
}

async function enviarPergunta() {
    const pergunta = perguntaInput.value.trim();

    if (!pergunta) {
        alert("Digite uma pergunta!");
        perguntaInput.focus();
        return;
    }

    consultarBotao.disabled = true;
    novaConversaBotao.disabled = true;
    limparHistoricoBotao.disabled = true;
    perguntaInput.disabled = true;

    adicionarMensagem("Você", pergunta, "usuario");
    const respostasAguardando = [
        ["OpenAI (ChatGPT)", "Consultando..."],
        ["Gemini", "Consultando..."],
        ["Groq", "Consultando..."]
    ].map(([nome, texto]) => adicionarMensagem(nome, texto, "ia"));

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pergunta })
        });

        const corpo = await response.text();
        if (!corpo.trim()) {
            throw new Error("O servidor retornou uma resposta vazia. Inicie a aplicação com npm start e acesse http://localhost:3000.");
        }

        let data;
        try {
            data = JSON.parse(corpo);
        } catch {
            throw new Error("O servidor não retornou JSON. Inicie a aplicação com npm start e acesse http://localhost:3000.");
        }

        if (!response.ok) {
            throw new Error(data.erro || "Falha ao consultar as IAs.");
        }

        if (!data.openai || !data.gemini || !data.meta) {
            throw new Error("Resposta incompleta do servidor. Reinicie a aplicação com npm start.");
        }

        const respostas = [
            [respostasAguardando[0], data.openai],
            [respostasAguardando[1], data.gemini],
            [respostasAguardando[2], data.meta]
        ];

        for (const [mensagem, resposta] of respostas) {
            mensagem.conteudo.textContent = resposta?.texto || "Sem resposta.";
            mensagem.mensagem.classList.toggle("erro", !resposta?.ok);
        }

        try {
            salvarNoHistorico(pergunta);
        } catch {
            listaHistorico.textContent = "As respostas chegaram, mas não foi possível salvar o histórico neste navegador.";
        }
    } catch (erro) {
        for (const mensagem of respostasAguardando) {
            mensagem.conteudo.textContent = erro.message;
            mensagem.mensagem.classList.add("erro");
        }
    } finally {
        consultarBotao.disabled = false;
        novaConversaBotao.disabled = false;
        limparHistoricoBotao.disabled = false;
        perguntaInput.disabled = false;
    }
}

consultarBotao.addEventListener("click", enviarPergunta);
novaConversaBotao.addEventListener("click", () => {
    perguntaInput.value = "";
    conversaElemento.replaceChildren();
    adicionarMensagem("TeckPink AI", "Olá! Envie uma pergunta para começar.", "ia");
    perguntaInput.focus();
});

limparHistoricoBotao.addEventListener("click", () => {
    if (!confirm("Deseja apagar todo o histórico?")) return;

    historico = [];
    localStorage.removeItem(chaveHistorico);
    mostrarHistorico();
});

perguntaInput.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
        evento.preventDefault();
        enviarPergunta();
    }
});

mostrarHistorico();
