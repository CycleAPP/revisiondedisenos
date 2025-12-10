export const getEmailTemplate = ({ title, message, items = [], actionLink, actionText }) => {
  const itemsHtml = items.length > 0
    ? `<div style="margin: 24px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; color: white;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">📋 Tareas Asignadas</h3>
        <ul style="padding-left: 0; margin: 0; list-style: none;">
          ${items.map(item => `<li style="margin-bottom: 10px; padding: 12px 16px; background: rgba(255,255,255,0.15); border-radius: 8px; backdrop-filter: blur(10px);">✨ ${item}</li>`).join('')}
        </ul>
      </div>`
    : '';

  const buttonHtml = actionLink
    ? `<div style="text-align: center; margin-top: 32px;">
         <a href="${actionLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);">${actionText || 'Ver en Plataforma'}</a>
       </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); margin: 0; padding: 40px 20px; min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.1);">
    
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
      <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 24px; border-radius: 50px; margin-bottom: 16px;">
        <span style="color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">💎 LUMINA</span>
      </div>
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 300; letter-spacing: 1px;">Diseño de Empaque</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 22px; font-weight: 600;">${title}</h2>
      <div style="font-size: 16px; color: #555; line-height: 1.7;">
        ${message}
      </div>
      ${itemsHtml}
      ${buttonHtml}
    </div>
    
    <!-- Footer -->
    <div style="background: #fafafa; padding: 24px 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        🚀 Sistema de Gestión de Diseños | Lumina Packaging
      </p>
      <p style="margin: 8px 0 0 0; font-size: 11px; color: #bbb;">
        Este es un mensaje automático, por favor no responder.
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
};
