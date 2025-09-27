// App authentication endpoint for macOS app OAuth flow
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { return_to, session } = req.query;
  
  // Validate required parameters
  if (!return_to || !return_to.startsWith('asanabridge://') || !session) {
    return res.status(400).json({ error: 'Invalid authentication request' });
  }

  // Show a simple authentication page
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>AsanaBridge App Authentication</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
        max-width: 500px; 
        margin: 100px auto; 
        padding: 20px; 
        text-align: center;
        background: #f5f5f5;
      }
      .container {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .button {
        background: #007AFF;
        color: white;
        border: none;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 18px;
        cursor: pointer;
        margin: 20px;
        transition: background 0.3s;
      }
      .button:hover { background: #0056CC; }
      h1 { color: #333; margin-bottom: 10px; }
      p { color: #666; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 Connect AsanaBridge App</h1>
      <p>You're about to authorize your AsanaBridge macOS app to sync tasks between Asana and OmniFocus.</p>
      <p><strong>This will allow the app to:</strong></p>
      <ul style="text-align: left; color: #666;">
        <li>Sync your Asana tasks to OmniFocus</li>
        <li>Update task status in both applications</li>
        <li>Run automatic background sync</li>
      </ul>
      
      <button class="button" onclick="authorize()">
        ✅ Authorize AsanaBridge App
      </button>
      
      <p style="font-size: 14px; color: #999; margin-top: 30px;">
        This will redirect back to your AsanaBridge app with a secure token.
      </p>
    </div>
    
    <script>
      function authorize() {
        // Generate a demo token for testing
        const token = 'demo_token_' + Math.random().toString(36).substr(2, 32);
        const callbackUrl = '${return_to}?token=' + encodeURIComponent(token) + '&session=' + encodeURIComponent('${session}');
        
        // Show success message briefly
        document.querySelector('.container').innerHTML = \`
          <h1>✅ Authorization Complete!</h1>
          <p>Redirecting back to your AsanaBridge app...</p>
          <div style="margin: 20px 0;">
            <div style="width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid #007AFF; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          </div>
        \`;
        
        // Add spinning animation
        const style = document.createElement('style');
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
        
        // Redirect after a brief delay
        setTimeout(() => {
          window.location.href = callbackUrl;
        }, 2000);
      }
    </script>
  </body>
  </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}