/**
 * Tests headless browser pour vérifier le chargement des pages
 * et l'absence d'erreurs console
 */

const puppeteer = require('puppeteer');
const http = require('http');
const handler = require('serve-handler');
const path = require('path');

const PORT = 8765;
let server;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((request, response) => {
      return handler(request, response, {
        public: path.join(__dirname)
      });
    });
    
    server.listen(PORT, () => {
      console.log(`Serveur local démarré sur http://localhost:${PORT}\n`);
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('\nServeur arrêté.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function testPage(browser, url, name, viewport) {
  console.log(`\n🧪 Test : ${name} (${viewport.width}x${viewport.height})`);
  
  const page = await browser.newPage();
  await page.setViewport(viewport);
  
  const errors = [];
  const warnings = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.toString());
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForTimeout(2000);
    
    const title = await page.title();
    console.log(`   ✓ Page chargée : "${title}"`);
    
    const hasContent = await page.evaluate(() => document.body.textContent.trim().length > 0);
    if (!hasContent) {
      errors.push('Page vide (pas de contenu)');
    } else {
      console.log(`   ✓ Contenu présent`);
    }
    
    if (errors.length === 0) {
      console.log(`   ✅ Aucune erreur console`);
    } else {
      console.log(`   ❌ ${errors.length} erreur(s) console :`);
      errors.forEach(err => console.log(`      - ${err}`));
    }
    
    if (warnings.length > 0) {
      console.log(`   ⚠️  ${warnings.length} avertissement(s) (ignorés)`);
    }
    
  } catch (error) {
    console.log(`   ❌ Échec du chargement : ${error.message}`);
    errors.push(error.message);
  }
  
  await page.close();
  return errors.length === 0;
}

async function testChessMoves(browser, viewport) {
  console.log(`\n🧪 Test : Mouvements d'échecs (${viewport.width}x${viewport.height})`);
  
  const page = await browser.newPage();
  await page.setViewport(viewport);
  
  const errors = [];
  
  page.on('pageerror', error => {
    errors.push(error.toString());
  });
  
  try {
    await page.goto(`http://localhost:${PORT}/echecs/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('   ✓ Page d\'échecs chargée');
    
    const canvas = await page.$('#chess-container canvas');
    if (!canvas) {
      errors.push('Canvas Three.js non trouvé');
      console.log('   ❌ Canvas Three.js non trouvé');
    } else {
      console.log('   ✓ Canvas Three.js présent');
    }
    
    const turnIndicator = await page.$eval('#turn-indicator', el => el.textContent);
    if (turnIndicator.includes('Blancs')) {
      console.log('   ✓ Indicateur de tour correct');
    } else {
      errors.push('Indicateur de tour incorrect');
    }
    
    const aiModeBtn = await page.$('[data-mode="ai"]');
    if (aiModeBtn) {
      await aiModeBtn.click();
      await page.waitForTimeout(500);
      console.log('   ✓ Bouton mode IA cliqué');
      
      const aiSettings = await page.$eval('#ai-settings', el => 
        window.getComputedStyle(el).display
      );
      if (aiSettings !== 'none') {
        console.log('   ✓ Paramètres IA affichés');
      } else {
        errors.push('Paramètres IA non affichés');
      }
    }
    
    if (errors.length === 0) {
      console.log('   ✅ Test des échecs réussi');
    }
    
  } catch (error) {
    console.log(`   ❌ Échec : ${error.message}`);
    errors.push(error.message);
  }
  
  await page.close();
  return errors.length === 0;
}

async function captureScreenshots(browser) {
  console.log('\n📸 Capture des screenshots...');
  
  const screenshots = [
    { url: `http://localhost:${PORT}/`, name: 'home', viewport: { width: 1280, height: 800 } },
    { url: `http://localhost:${PORT}/`, name: 'home-mobile', viewport: { width: 375, height: 812 } },
    { url: `http://localhost:${PORT}/echecs/`, name: 'chess', viewport: { width: 1280, height: 800 } },
    { url: `http://localhost:${PORT}/echecs/`, name: 'chess-mobile', viewport: { width: 375, height: 812 } }
  ];
  
  for (const shot of screenshots) {
    const page = await browser.newPage();
    await page.setViewport(shot.viewport);
    await page.goto(shot.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const path = `screenshots/${shot.name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`   ✓ ${path}`);
    
    await page.close();
  }
  
  console.log('   ✅ Screenshots capturés');
}

async function runTests() {
  console.log('🚀 Démarrage des tests headless browser\n');
  console.log('=' .repeat(60));
  
  await startServer();
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const results = [];
  
  const desktopViewport = { width: 1280, height: 800 };
  const mobileViewport = { width: 375, height: 812 };
  
  results.push(await testPage(browser, `http://localhost:${PORT}/`, 'Page d\'accueil', desktopViewport));
  results.push(await testPage(browser, `http://localhost:${PORT}/`, 'Page d\'accueil', mobileViewport));
  
  results.push(await testPage(browser, `http://localhost:${PORT}/blackjack/`, 'Blackjack', desktopViewport));
  results.push(await testPage(browser, `http://localhost:${PORT}/blackjack/`, 'Blackjack', mobileViewport));
  
  results.push(await testPage(browser, `http://localhost:${PORT}/echecs/`, 'Échecs', desktopViewport));
  results.push(await testPage(browser, `http://localhost:${PORT}/echecs/`, 'Échecs', mobileViewport));
  
  results.push(await testChessMoves(browser, desktopViewport));
  
  await captureScreenshots(browser);
  
  await browser.close();
  await stopServer();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Résumé des tests\n');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ Tous les tests réussis (${passed}/${total})`);
    process.exit(0);
  } else {
    console.log(`❌ ${total - passed} test(s) échoué(s) sur ${total}`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Erreur fatale:', error);
  stopServer().then(() => process.exit(1));
});
