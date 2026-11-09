/**
 * Test final complet avec captures d'écran et mouvements
 */

const puppeteer = require('puppeteer');

const PORT = 8899;

async function captureChessScreenshots() {
  console.log('🎮 Capture des screenshots finaux du jeu d\'échecs\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox'
    ]
  });
  
  const tests = [
    { name: 'chess', viewport: { width: 1280, height: 800 } },
    { name: 'chess-mobile', viewport: { width: 375, height: 812 } },
  ];
  
  for (const test of tests) {
    console.log(`📸 Capture: ${test.name} (${test.viewport.width}x${test.viewport.height})`);
    
    const page = await browser.newPage();
    await page.setViewport(test.viewport);
    
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
    });
    
    try {
      await page.goto(`http://localhost:${PORT}/echecs/`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      await page.waitForTimeout(4000);
      
      const info = await page.evaluate(() => {
        const canvas = document.querySelector('#chess-container canvas');
        const turn = document.querySelector('#turn-indicator');
        
        return {
          hasCanvas: !!canvas,
          canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
          turnText: turn ? turn.textContent.trim() : 'N/A',
          threeLoaded: typeof THREE !== 'undefined',
          chessLoaded: typeof Chess !== 'undefined'
        };
      });
      
      console.log(`   Canvas: ${info.hasCanvas ? '✓' : '✗'} ${JSON.stringify(info.canvasSize)}`);
      console.log(`   Three.js: ${info.threeLoaded ? '✓' : '✗'}, chess.js: ${info.chessLoaded ? '✓' : '✗'}`);
      console.log(`   Tour: ${info.turnText}`);
      
      const errors = consoleMessages.filter(m => m.type === 'error' && !m.text.includes('favicon'));
      if (errors.length > 0) {
        console.log(`   ⚠️  ${errors.length} erreur(s):`);
        errors.forEach(e => console.log(`      - ${e.text}`));
      } else {
        console.log(`   ✓ Aucune erreur`);
      }
      
      const path = `screenshots/${test.name}.png`;
      await page.screenshot({ path, fullPage: false });
      console.log(`   ✅ Sauvegardé: ${path}\n`);
      
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}\n`);
    }
    
    await page.close();
  }
  
  console.log('🎯 Test des mouvements\n');
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    await page.goto(`http://localhost:${PORT}/echecs/`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(4000);
    
    console.log('   1️⃣  Coup 1: e2 → e4 (Blancs)');
    
    const container = await page.$('#chess-container');
    const box = await container.boundingBox();
    
    await page.mouse.click(box.x + box.width * 0.625, box.y + box.height * 0.875);
    await page.waitForTimeout(300);
    await page.mouse.click(box.x + box.width * 0.625, box.y + box.height * 0.625);
    await page.waitForTimeout(1500);
    
    let turn = await page.$eval('#turn-indicator', el => el.textContent);
    console.log(`   Tour: ${turn.includes('Noirs') ? '✓ Noirs' : '✗ ' + turn.trim()}`);
    
    console.log('   2️⃣  Coup 2: e7 → e5 (Noirs)');
    
    await page.mouse.click(box.x + box.width * 0.625, box.y + box.height * 0.125);
    await page.waitForTimeout(300);
    await page.mouse.click(box.x + box.width * 0.625, box.y + box.height * 0.375);
    await page.waitForTimeout(1500);
    
    turn = await page.$eval('#turn-indicator', el => el.textContent);
    console.log(`   Tour: ${turn.includes('Blancs') ? '✓ Blancs' : '✗ ' + turn.trim()}`);
    
    const moves = await page.$eval('#moves-list', el => el.textContent);
    console.log(`   Historique: ${moves.includes('e4') && moves.includes('e5') ? '✓' : '✗'} ${moves.trim()}`);
    
    console.log('\n   3️⃣  Test mode IA');
    
    await page.click('[data-mode="ai"]');
    await page.waitForTimeout(500);
    
    const aiVisible = await page.$eval('#ai-settings', el => 
      window.getComputedStyle(el).display !== 'none'
    );
    console.log(`   Paramètres IA: ${aiVisible ? '✓ Affichés' : '✗ Cachés'}`);
    
    await page.screenshot({ path: 'screenshots/chess-with-moves.png' });
    console.log(`   ✅ Screenshot avec mouvements sauvegardé\n`);
    
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
  }
  
  await page.close();
  await browser.close();
  
  console.log('✅ Tous les tests terminés!');
}

captureChessScreenshots().catch(console.error);
