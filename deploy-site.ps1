# Script para commitar e publicar site (PowerShell)
# Uso: execute este script na raiz do seu projeto local antes de aguardar o GitHub Pages rebuild.

Write-Host "Preparando commit e push das alterações do site..."

# Confirmação de arquivo a commitar
Write-Host "Arquivos que serão adicionados: index.html, firebase-messaging-sw.js, manifest.json, pasta oficial e GUIA_PWA.md"
$ok = Read-Host "Continuar e realizar git add/commit/push? (y/N)"
if ($ok -ne 'y' -and $ok -ne 'Y') { Write-Host "Operação cancelada."; exit 0 }

# Adiciona alterações principais incluindo a pasta oficial criada para deploy
git add index.html firebase-messaging-sw.js manifest.json GUIA_PWA.md oficial/* img/* service-worker.js

$mensagem = Read-Host "Mensagem do commit (pressione Enter para usar padrão)"
if ([string]::IsNullOrWhiteSpace($mensagem)) { $mensagem = "Atualiza configuração PWA e FCM" }

git commit -m $mensagem

Write-Host "Fazendo push para origin/main..."
git push origin main

Write-Host "Push enviado. Aguarde o GitHub Pages publicar (pode levar alguns minutos)."