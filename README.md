# TCC 2026 — Mensalidade de Prestadores (Firebase + Mercado Pago)

Este repositório contém o app (React Native/Expo) e as Cloud Functions (Firebase) para cobrança de mensalidade de prestadores com:

- geração de cobrança (PIX e/ou link),
- tolerância de 3 dias após vencimento,
- bloqueio automático,
- reativação automática após pagamento confirmado,
- webhook do Mercado Pago + validação server-side,
- notificações (via coleção `Usuario/{uid}/Notificacoes`).

## Firestore (modelo)

Coleção `Usuario/{uid}` (prestador):

- `tipo: 'prestador'`
- `dataCadastro: Timestamp`
- `dataVencimento: Timestamp`
- `assinaturaAtiva: boolean`
- `contaAtiva: boolean`
- `ultimoPagamento: Timestamp | null`
- `statusPagamento: 'em_dia' | 'em_atraso_tolerancia' | 'inadimplente' | 'pago'`
- `valorMensalidade: number`

Subcoleções:

- `Usuario/{uid}/Mensalidades/{periodKey}` (ex.: `2026-05`)
- `Usuario/{uid}/Notificacoes/{id}`

## Cloud Functions (backend)

Arquivo: `functions/index.js`

Exports principais:

- `onUsuarioCreateInitBilling`: inicializa dados de cobrança quando um prestador é criado.
- `createMensalidade` (callable): cria fatura do período e gera PIX/link (Mercado Pago).
- `getMensalidadeStatus` (callable): retorna status atual (fonte de verdade).
- `mercadoPagoWebhook` (HTTP): recebe confirmação de pagamento (consulta o MP e atualiza Firestore).
- `checkMensalidadesDaily` (scheduler): roda diariamente, envia avisos e bloqueia após tolerância.

### Variáveis/Config

Configure o token do Mercado Pago (produção) no backend:

- `MERCADO_PAGO_ACCESS_TOKEN` (ou `MP_ACCESS_TOKEN`)
- `MENSALIDADE_VALOR` (opcional, default `29.9`)
- `MP_NOTIFICATION_URL` (opcional, URL pública do webhook do Firebase)
- `MP_WEBHOOK_SECRET` (opcional, reforço de segurança)

Também é possível usar `firebase functions:config:set mercadopago.token="..."`.

## App (frontend)

Arquivos adicionados:

- `services/billingService.ts`
- `hooks/useMensalidadeStatus.ts`
- `screens/MensalidadeBloqueada.tsx`
- `screens/PagamentoMensalidade.tsx`

Proteção:

- `screens/MenuTrabalhador.tsx` verifica `contaAtiva` e mostra a tela de bloqueio quando necessário.
- `screens/Profissionais.tsx` ignora prestadores com `contaAtiva=false`/`assinaturaAtiva=false`.

## Regras Firestore

Arquivo: `firestore.rules`

- Prestador não pode alterar campos de cobrança pelo app.
- Prestador pode ler suas `Mensalidades` e `Notificacoes`.
- Leitura pública do doc do prestador só quando `contaAtiva==true` (evita aparecer em buscas).

Importante: as regras gerais ainda permitem `read/write` autenticado para outras coleções; endureça por coleção conforme seu domínio.

## Mapa e localização voluntária

- O prestador ativa ou desativa a visibilidade na página inicial.
- A posição é aproximada, fica na coleção `LocalizacoesPrestadores` e expira após duas horas.
- Somente contratantes autenticados podem consultar localizações válidas de prestadores ativos.
- Não há rastreamento em segundo plano.

Para o mapa funcionar em um APK Android próprio, configure `GOOGLE_MAPS_API_KEY` no ambiente do build com uma chave que tenha o Maps SDK for Android habilitado. O arquivo `app.config.js` injeta a chave na configuração nativa sem gravá-la no repositório.

