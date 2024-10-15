addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/check' && event.request.method === 'POST') {
    event.respondWith(handleCheckRequest(event.request));
  } else {
    event.respondWith(serveHtml());
  }
});

async function handleCheckRequest(request) {
  try {
    const { hostnames } = await request.json();
    if (!hostnames || !Array.isArray(hostnames)) {
      return new Response('Invalid request body', { status: 400 });
    }

    console.log(`Received hostnames: ${hostnames.join(', ')}`);

    const results = await checkHostnames(hostnames);
    console.log(`Valid hostnames: ${results.join(', ')}`);

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Error in handleCheckRequest: ${error.message}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function checkHostnames(hostnames) {
  const validHostnames = [];

  for (const hostname of hostnames) {
    try {
      console.log(`Checking hostname: ${hostname}`);
      const response = await fetch(`http://ip-api.com/line/${hostname}`);
      if (!response.ok) {
        console.error(`Request failed for ${hostname}, status: ${response.status}`);
        continue;
      }

      const data = await response.text();
      const lines = data.split('\n');
      console.log(`Response for ${hostname}: ${lines.join(' | ')}`);

      if (lines[0].trim().toLowerCase() === 'success' &&
          (lines[10]?.includes('Fastly') || lines[11]?.includes('Fastly') || lines[12]?.includes('Fastly'))) {
        validHostnames.push(hostname);
        console.log(`${hostname} is valid.`);
      } else {
        console.log(`${hostname} does not meet the conditions.`);
      }
    } catch (error) {
      console.error(`Error while checking ${hostname}: ${error.message}`);
    }
  }

  return validHostnames;
}

function serveHtml() {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fastly Hostname Checker</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        background-color: white;
        color: #333;
        margin: 0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      h1 {
        color: #ff6600;
        font-size: 2.5em;
        margin-bottom: 20px;
      }
      p {
        font-size: 1.2em;
        margin-bottom: 10px;
        color: #666;
      }
      textarea {
        width: 100%;
        max-width: 600px;
        height: 150px;
        padding: 10px;
        font-size: 1em;
        border: 2px solid #ff6600;
        border-radius: 5px;
        margin-bottom: 20px;
        box-shadow: 2px 2px 10px rgba(0,0,0,0.1);
      }
      button {
        padding: 10px 20px;
        background-color: #ff6600;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1.2em;
        margin-right: 10px;
        transition: background-color 0.3s ease;
      }
      button:hover {
        background-color: #cc5200;
      }
      #result-box {
        width: 100%;
        max-width: 600px;
        height: 150px;
        padding: 10px;
        margin-top: 20px;
        background-color: #fff5e6;
        border: 2px solid #ff6600;
        border-radius: 5px;
        overflow-y: auto;
        box-shadow: 2px 2px 10px rgba(0,0,0,0.1);
      }
      footer {
        margin-top: 30px;
        font-size: 0.9em;
        color: #999;
      }
    </style>
  </head>
  <body>
    <h1>Fastly CDN Hostname Checker</h1>
    <p>Enter hostnames (one per line):</p>
    <textarea id="hostnames-input" placeholder="Enter hostnames..."></textarea>
    <button id="start-btn">Start</button>
    <br>
    <button id="copy-btn">Copy Result</button>
    
    <div id="result-box"></div>

    <footer>&copy; 2024 <a href="https://github.com/Surfboardv2ray">Surfboardv2ray</a>
    </footer>

    <script>
      async function checkHostnames() {
        const input = document.getElementById('hostnames-input').value.trim();
        const hostnames = input.split('\\n').map(host => host.trim()).filter(Boolean);

        console.log('Hostnames to be checked:', hostnames);

        const resultBox = document.getElementById('result-box');
        resultBox.textContent = 'Checking...';

        try {
          const response = await fetch('/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostnames })
          });

          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          const data = await response.json();
          console.log('Response from Worker:', data);

          const results = data.results.join('<br>');
          resultBox.innerHTML = results || 'No results found.';
        } catch (error) {
          console.error('Error during hostname check:', error);
          resultBox.textContent = 'Error: ' + error.message;
        }
      }

      document.getElementById('start-btn').addEventListener('click', checkHostnames);

      document.getElementById('copy-btn').addEventListener('click', () => {
        const resultText = document.getElementById('result-box').textContent;
        navigator.clipboard.writeText(resultText).then(() => {
          alert('Results copied to clipboard!');
        }, () => {
          alert('Failed to copy text');
        });
      });
    </script>
  </body>
  </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
