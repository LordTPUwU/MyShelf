function salvarCad() {
    let nome = document.getElementById("nome").value;
    localStorage.setItem("nomeUsuario", nome);
}