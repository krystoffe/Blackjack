/**
 * Test manuel simplifié pour vérifier les pages
 */

const http = require('http');
const handler = require('serve-handler');
const path = require('path');

const PORT = 8765;

async function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      return handler(request, response, {
        public: path.join(__dirname)
      });
    });
    
    server.listen(PORT, () => {
      console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function testUrls(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      const status = response.status;
      console.log(`${status === 200 ? '✅' : '❌'} ${url} - HTTP ${status}`);
    } catch (error) {
      console.log(`❌ ${url} - ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Tests manuels du hub de jeux\n');
  
  const server = await startServer();
  
  console.log('\n📋 Test des URLs...\n');
  
  await testUrls([
    `http://localhost:${PORT}/`,
    `http://localhost:${PORT}/index.html`,
    `http://localhost:${PORT}/home.js`,
    `http://localhost:${PORT}/home-style.css`,
    `http://localhost:${PORT}/blackjack/`,
    `http://localhost:${PORT}/blackjack/index.html`,
    `http://localhost:${PORT}/blackjack/game.js`,
    `http://localhost:${PORT}/blackjack/style.css`,
    `http://localhost:${PORT}/echecs/`,
    `http://localhost:${PORT}/echecs/index.html`,
    `http://localhost:${PORT}/echecs/chess-game.js`,
    `http://localhost:${PORT}/echecs/chess-style.css`,
    `http://localhost:${PORT}/echecs/three.min.js`,
    `http://localhost:${PORT}/echecs/OrbitControls.js`,
    `http://localhost:${PORT}/echecs/chess.min.js`
  ]);
  
  console.log('\n✅ Tests terminés');
  console.log('\n📝 Pour tester manuellement :');
  console.log(`   - Ouvrez http://localhost:${PORT}/ dans votre navigateur`);
  console.log('   - Testez la navigation entre les jeux');
  console.log('   - Vérifiez que le Blackjack et les Échecs fonctionnent');
  console.log('\n⏸️  Appuyez sur Ctrl+C pour arrêter le serveur...');
}

main().catch(console.error);
