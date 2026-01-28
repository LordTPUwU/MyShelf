function salvarCad() {
    // Obter valores do formulário de registro (IDs únicos)
    let nome = document.getElementById("nome").value;
    let email = document.getElementById("email-register").value;
    let senha = document.getElementById("senha-register").value;

    // Validação simples: garantir que nome, email e senha não estejam vazios
    if (!nome || !email || !senha) {
        alert('Por favor, preencha nome, email e senha antes de cadastrar.');
        return;
    }

    // Salvar no localStorage
    localStorage.setItem("nomeUsuario", nome);
    localStorage.setItem("emailUsuario", email);
    localStorage.setItem("senhaUsuario", senha);

    // Feedback ao usuário
    alert('Cadastro salvo com sucesso!');
    
    // Limpar campos após cadastro
    document.getElementById("nome").value = "";
    document.getElementById("email-register").value = "";
    document.getElementById("senha-register").value = "";
}

function fazerLogin() {
    // Obter valores do formulário de login
    let email = document.getElementById("email").value;
    let senha = document.getElementById("senha").value;

    // Validação: verificar se os campos estão preenchidos
    if (!email || !senha) {
        alert('Por favor, preencha email e senha para fazer login.');
        return;
    }

    // Consultar localStorage para validar credenciais
    let emailArmazenado = localStorage.getItem("emailUsuario");
    let senhaArmazenada = localStorage.getItem("senhaUsuario");

    // Verificar se as credenciais estão corretas
    if (email === emailArmazenado && senha === senhaArmazenada) {
        alert('Login realizado com sucesso! Bem-vindo ' + localStorage.getItem("nomeUsuario"));
        // Redirecionar para a página principal
        window.location.href = "index.html";
    } else {
        alert('Email ou senha incorretos. Tente novamente ou registre-se.');
    }
}