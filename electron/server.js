const http = require('http');
const path = require('path');
const next = require('next');

async function startServer(appDir) {
  const nextApp = next({
    dev: false,
    dir: appDir,
  });

  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });

    server.on('error', reject);
  });
}

module.exports = { startServer };
