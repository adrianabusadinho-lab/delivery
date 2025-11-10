// Firebase Cloud Functions para enviar notificações automáticas
// Quando você mudar o status do pedido no Firebase, esta função detecta e envia notificação

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Mensagens de notificação por status
const statusNotifications = {
    'Pendente': {
        title: '✅ Pedido Recebido!',
        body: 'Seu pedido foi recebido e está sendo processado.'
    },
    'Em Preparo': {
        title: '👨‍🍳 Preparando seu Pedido!',
        body: 'Estamos preparando seu pedido com muito carinho!'
    },
    'Pronto': {
        title: '✅ Pedido Pronto!',
        body: 'Seu pedido está pronto e aguardando entrega!'
    },
    'Saiu para Entrega': {
        title: '🛵 Saiu para Entrega!',
        body: 'Seu pedido está a caminho! O entregador já saiu.'
    },
    'Entregue': {
        title: '🎉 Pedido Entregue!',
        body: 'Seu pedido foi entregue! Bom apetite! 😋'
    },
    'Cancelado': {
        title: '❌ Pedido Cancelado',
        body: 'Seu pedido foi cancelado. Entre em contato se tiver dúvidas.'
    }
};

// Função que detecta quando o status do pedido muda
exports.enviarNotificacaoMudancaStatus = functions.database
    .ref('/delivery_pedidos/{pedidoId}/status')
    .onUpdate(async (change, context) => {
        const pedidoId = context.params.pedidoId;
        const novoStatus = change.after.val();
        const statusAnterior = change.before.val();

        console.log(`Pedido ${pedidoId}: Status mudou de "${statusAnterior}" para "${novoStatus}"`);

        // Busca os dados completos do pedido
        const pedidoSnapshot = await admin.database()
            .ref(`/delivery_pedidos/${pedidoId}`)
            .once('value');
        
        const pedido = pedidoSnapshot.val();

        // Coleta tokens FCM (suporta fcmTokens map e campo legada fcmToken)
        if (!pedido) {
            console.log('Pedido não encontrado.');
            return null;
        }

        // tokens pode vir em pedido.fcmTokens (objeto) ou pedido.fcmToken (string antiga)
        const tokensSet = new Set();
        if (pedido.fcmTokens && typeof pedido.fcmTokens === 'object') {
            Object.keys(pedido.fcmTokens).forEach(t => tokensSet.add(t));
        }
        if (pedido.fcmToken && typeof pedido.fcmToken === 'string') {
            tokensSet.add(pedido.fcmToken);
        }

        const tokens = Array.from(tokensSet);
        if (tokens.length === 0) {
            console.log('Nenhum token FCM encontrado para o pedido. Notificação não enviada.');
            return null;
        }

        // Busca a mensagem correspondente ao status
        const notification = statusNotifications[novoStatus];

        if (!notification) {
            console.log(`Sem mensagem definida para o status: ${novoStatus}`);
            return null;
        }

        // Monta mensagens para todos os tokens (usa sendAll para enviar em lote)
        const messages = tokens.map(token => ({
            token: token,
            notification: {
                title: notification.title,
                body: `Pedido ${pedido.codigo}: ${notification.body}`
            },
            data: {
                pedidoId: pedidoId,
                codigo: pedido.codigo,
                status: novoStatus,
                timestamp: new Date().toISOString()
            },
                webpush: {
                fcmOptions: {
                    link: '/'
                },
                notification: {
                    icon: '/img/Captura_de_tela_2025-11-06_123540-removebg-preview.png',
                    badge: '/img/Captura_de_tela_2025-11-06_123540-removebg-preview.png',
                    vibrate: [200, 100, 200]
                }
            }
        }));

        // Envia em lote e trata tokens inválidos
        try {
            const batchResponse = await admin.messaging().sendAll(messages);
            console.log(`✅ Enviadas ${batchResponse.successCount} notificações; ${batchResponse.failureCount} falhas.`);

            // Para cada resposta com erro, remover o token inválido do DB
            batchResponse.responses.forEach(async (resp, idx) => {
                if (!resp.success) {
                    const err = resp.error;
                    console.error('Erro enviando para token', tokens[idx], err);
                    const code = err.code || '';
                    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('messaging/registration-token-not-registered') || code.includes('messaging/invalid-registration-token')) {
                        try {
                            await admin.database().ref(`/delivery_pedidos/${pedidoId}/fcmTokens/${tokens[idx]}`).remove();
                            console.log('Token inválido removido:', tokens[idx]);
                        } catch (removeErr) {
                            console.warn('Erro removendo token inválido:', removeErr);
                        }
                    }
                }
            });

            return batchResponse;
        } catch (error) {
            console.error('❌ Erro ao enviar notificações em lote:', error);
            return null;
        }
    });

    // Envia notificação quando um pedido é CRIADO (opcional: aviso para o estabelecimento / cliente)
    exports.enviarNotificacaoAoCriarPedido = functions.database
        .ref('/delivery_pedidos/{pedidoId}')
        .onCreate(async (snapshot, context) => {
            const pedidoId = context.params.pedidoId;
            const pedido = snapshot.val();

            console.log(`Novo pedido criado: ${pedidoId}`, pedido && pedido.codigo ? `codigo=${pedido.codigo}` : 'sem codigo');

            if (!pedido) {
                console.log('Pedido inexistente. Abortando.');
                return null;
            }

            // Coleta tokens (suporta fcmTokens map e fcmToken legado)
            const tokensSet = new Set();
            if (pedido.fcmTokens && typeof pedido.fcmTokens === 'object') {
                Object.keys(pedido.fcmTokens).forEach(t => tokensSet.add(t));
            }
            if (pedido.fcmToken && typeof pedido.fcmToken === 'string') {
                tokensSet.add(pedido.fcmToken);
            }

            const tokens = Array.from(tokensSet);
            if (tokens.length === 0) {
                console.log('Nenhum token para este pedido. Nada a enviar.');
                return null;
            }

            const title = '🆕 Pedido recebido';
            const body = `Recebemos seu pedido ${pedido.codigo || ''}. Acompanhe o status.`;

            const messages = tokens.map(token => ({
                token,
                notification: {
                    title,
                    body: `Pedido ${pedido.codigo || ''}: recebido com sucesso.`
                },
                data: {
                    pedidoId: pedidoId,
                    codigo: pedido.codigo || '',
                    timestamp: new Date().toISOString()
                },
                webpush: {
                    fcmOptions: { link: '/' },
                    notification: {
                        icon: '/img/Captura_de_tela_2025-11-06_123540-removebg-preview.png',
                        badge: '/img/Captura_de_tela_2025-11-06_123540-removebg-preview.png'
                    }
                }
            }));

            try {
                const batchResponse = await admin.messaging().sendAll(messages);
                console.log(`Enviar ao criar pedido: ${batchResponse.successCount} sucesso(s), ${batchResponse.failureCount} falha(s)`);

                batchResponse.responses.forEach(async (resp, idx) => {
                    if (!resp.success) {
                        const err = resp.error;
                        console.error('Erro enviando para token', tokens[idx], err);
                        const code = err && err.code ? err.code : '';
                        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('messaging/registration-token-not-registered') || code.includes('messaging/invalid-registration-token')) {
                            try {
                                await admin.database().ref(`/delivery_pedidos/${pedidoId}/fcmTokens/${tokens[idx]}`).remove();
                                console.log('Token inválido removido:', tokens[idx]);
                            } catch (removeErr) {
                                console.warn('Erro removendo token inválido:', removeErr);
                            }
                        }
                    }
                });

                return batchResponse;
            } catch (error) {
                console.error('Erro ao enviar notificações ao criar pedido:', error);
                return null;
            }
        });
