# Deploy das Cloud Functions (PowerShell)
# Execute este script dentro do Windows PowerShell onde o Firebase CLI estiver configurado.
# Uso: abra PowerShell e execute: .\deploy-functions.ps1

Write-Host "Deploy das Cloud Functions para o projeto Firebase (tuta-lanches)"

# Caminho atual assumido: este script está dentro de functions/
$here = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $here

# Instala dependências (se necessário)
if (-Not (Test-Path node_modules)) {
    Write-Host "node_modules não encontrado — executando npm install..."
    npm install
} else {
    Write-Host "node_modules encontrado — pulando npm install (remova node_modules se quiser reinstalar)."
}

# Confirmação
Write-Host "Pronto para deploy. Certifique-se de ter feito 'firebase login' e 'firebase use --add' se necessário."
$ok = Read-Host "Deseja continuar com 'firebase deploy --only functions'? (y/N)"
if ($ok -ne 'y' -and $ok -ne 'Y') {
    Write-Host "Deploy cancelado pelo usuário."; exit 0
}

# Executa deploy
firebase deploy --only functions

Write-Host "Deploy finalizado. Verifique o Firebase Console para logs e status."