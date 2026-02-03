function getAccounts() {
    try { return JSON.parse(localStorage.getItem('accounts') || '{}'); } catch(e) { return {}; }
}
function saveAccounts(accounts) { localStorage.setItem('accounts', JSON.stringify(accounts)); }

function migrateLegacyAccount() {
    const accounts = getAccounts();
    if (Object.keys(accounts).length === 0) {
        const legacyEmail = localStorage.getItem('emailUsuario');
        const legacyPass = localStorage.getItem('senhaUsuario');
        const legacyName = localStorage.getItem('nomeUsuario');
        const legacyBio = localStorage.getItem('profileBio');
        const legacyAvatar = localStorage.getItem('profileAvatarImage');
        if (legacyEmail && legacyPass) {
            accounts[legacyEmail] = { name: legacyName || 'Usuário MyShelf', password: legacyPass, bio: legacyBio || '', avatar: legacyAvatar || null };
            saveAccounts(accounts);
            localStorage.removeItem('senhaUsuario');
        }
    }
}

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

    migrateLegacyAccount();
    const accounts = getAccounts();
    if (accounts[email]) {
        alert('Já existe uma conta registrada com este e-mail. Faça login ou use outro e-mail.');
        return;
    }

    // Salvar na lista de contas
    accounts[email] = { name: nome, password: senha, bio: '', avatar: null };
    saveAccounts(accounts);

    // definir sessão
    localStorage.setItem('emailUsuario', email);
    localStorage.setItem('nomeUsuario', nome);

    // Feedback ao usuário
    alert('Cadastro salvo com sucesso!');
    
    // Limpar campos após cadastro
    document.getElementById("nome").value = "";
    document.getElementById("email-register").value = "";
    document.getElementById("senha-register").value = "";
}

function fazerLogin() {
    migrateLegacyAccount();
    // Obter valores do formulário de login
    let email = document.getElementById("email").value;
    let senha = document.getElementById("senha").value;

    // Validação: verificar se os campos estão preenchidos
    if (!email || !senha) {
        alert('Por favor, preencha email e senha para fazer login.');
        return;
    }

    const accounts = getAccounts();
    const acc = accounts[email];
    if (!acc) {
        alert('Email não encontrado. Cadastre-se primeiro.');
        return;
    }

    if (senha === acc.password) {
        // set session
        localStorage.setItem('emailUsuario', email);
        localStorage.setItem('nomeUsuario', acc.name || 'Usuário MyShelf');
        localStorage.setItem('profileBio', acc.bio || '');
        if (acc.avatar) localStorage.setItem('profileAvatarImage', acc.avatar); else localStorage.removeItem('profileAvatarImage');

        alert('Login realizado com sucesso! Bem-vindo ' + (acc.name || 'Usuário MyShelf'));
        window.location.href = "index.html";
    } else {
        alert('Email ou senha incorretos. Tente novamente ou registre-se.');
    }
}