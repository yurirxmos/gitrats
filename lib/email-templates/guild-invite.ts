// Template de e-mail para convite de guilda (HTML minimalista)
// Explica o PORQUÊ: separado para facilitar manutenção e reutilização
export interface GuildInviteTemplateProps {
  invitedUsername: string;
  guildName: string;
  guildTag: string;
  inviterUsername: string;
  acceptUrl: string;
  appUrl: string;
}

export function buildGuildInviteEmail({
  invitedUsername,
  guildName,
  guildTag,
  inviterUsername,
  acceptUrl,
  appUrl,
}: GuildInviteTemplateProps) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Convite para Guilda</title>
<style>
  body { font-family: system-ui, -apple-system, Arial, sans-serif; background:#f6f6f6; margin:0; padding:24px; color:#222; }
  .wrap { max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e5e5; border-radius:8px; padding:28px; }
  h1 { font-size:20px; margin:0 0 16px 0; font-weight:600; }
  .box { border:1px solid #e0e0e0; border-radius:6px; padding:12px 14px; background:#fafafa; margin:16px 0; }
  .guild-name { font-size:16px; font-weight:600; margin:0 0 4px 0; }
  .tag { font-size:12px; color:#555; letter-spacing:.5px; }
  p { margin:12px 0; line-height:1.4; }
  .btn-wrap { text-align:center; margin:26px 0 12px; }
  .btn { display:inline-block; padding:10px 22px; font-size:14px; font-weight:500; background:#222; color:#fff !important; text-decoration:none; border-radius:6px; }
  .small { font-size:12px; color:#777; text-align:center; margin-top:18px; }
  a { color:#222; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Convite para Guilda</h1>
  <p>Olá <strong>${invitedUsername}</strong>,</p>
  <p><strong>${inviterUsername}</strong> convidou você para entrar na guilda:</p>
  <div class="box">
    <div class="guild-name">${guildName}</div>
    <div class="tag">${guildTag}</div>
  </div>
  <p>Ao entrar você poderá colaborar, somar XP em equipe e aparecer no ranking de guildas.</p>
  <div class="btn-wrap">
    <a class="btn" href="${acceptUrl}">Aceitar convite</a>
  </div>
  <p class="small">Se não reconhece este convite, apenas ignore.<br/>Acesse <a href="${appUrl}">GitRats</a> para continuar evoluindo 🐀</p>
</div>
</body>
</html>`;
}
