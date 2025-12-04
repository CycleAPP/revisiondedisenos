export const getEmailTemplate = ({ title, message, items = [], actionLink, actionText }) => {
    const itemsHtml = items.length > 0
        ? `<div style="margin: 20px 0; background: rgba(0,0,0,0.03); border-radius: 8px; padding: 15px;">
        <h3 style="margin-top: 0; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Detalles:</h3>
        <ul style="padding-left: 20px; margin: 0; color: #555;">
          ${items.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
        </ul>
      </div>`
        : '';

    const buttonHtml = actionLink
        ? `<div style="text-align: center; margin-top: 30px;">
         <a href="${actionLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">${actionText || 'Ver en Plataforma'}</a>
       </div>`
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: #000; color: #fff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 1px; }
    .content { padding: 40px; color: #333; line-height: 1.6; }
    .footer { background: #fafafa; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LUMINA | Diseño de Empaque</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #111; font-size: 18px;">${title}</h2>
      <div style="font-size: 15px; color: #444;">
        ${message}
      </div>
      ${itemsHtml}
      ${buttonHtml}
    </div>
    <div class="footer">
      <p>Este es un mensaje automático del sistema de gestión de diseños.</p>
    </div>
  </div>
</body>
</html>
  `;
};
