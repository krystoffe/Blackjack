/**
 * Test des mouvements en exécutant le code dans le contexte de la page
 */

const puppeteer = require('puppeteer');
const PORT = 8899;

async function testChessMoves() {
  console.log('♟️  Test des mouvements d\'échecs avec exécution interne\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto(`http://localhost:${PORT}/echecs/`, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  console.log('⏳ Attente du chargement complet...');
  await page.waitForTimeout(5000);
  
  console.log('\n📸 Capture initiale');
  await page.screenshot({ path: 'screenshots/chess-initial.png' });
  console.log('   ✓ screenshots/chess-initial.png');
  
  console.log('\n🎮 Mode 2 joueurs - Tentative de mouvements programmatiques\n');
  
  const result1 = await page.evaluate(() => {
    if (typeof game === 'undefined') return { error: 'game non défini' };
    
    try {
      const move = game.move({ from: 'e2', to: 'e4' });
      
      if (!move) return { error: 'Mouvement invalide', turn: game.turn() };
      
      return { 
        success: true, 
        move: move.san,
        turn: game.turn(),
        history: game.history()
      };
    } catch (err) {
      return { error: err.message };
    }
  });
  
  console.log('   1. e2-e4 (Blancs):', JSON.stringify(result1));
  
  if (result1.success) {
    await page.waitForTimeout(500);
    
    await page.evaluate(() => {
      if (typeof createPieces === 'function') {
        clearPieces();
        createPieces();
      }
    });
    
    await page.waitForTimeout(1000);
    
    console.log('   📸 Capture après e2-e4');
    await page.screenshot({ path: 'screenshots/chess-after-e2e4.png' });
    
    const result2 = await page.evaluate(() => {
      try {
        const move = game.move({ from: 'e7', to: 'e5' });
        return { 
          success: true, 
          move: move.san,
          turn: game.turn(),
          history: game.history()
        };
      } catch (err) {
        return { error: err.message };
      }
    });
    
    console.log('   2. e7-e5 (Noirs):', JSON.stringify(result2));
    
    if (result2.success) {
      await page.waitForTimeout(500);
      
      await page.evaluate(() => {
        if (typeof createPieces === 'function') {
          clearPieces();
          createPieces();
        }
        if (typeof updateUI === 'function') {
          updateUI();
        }
      });
      
      await page.waitForTimeout(1000);
      
      console.log('   📸 Capture après e7-e5');
      await page.screenshot({ path: 'screenshots/chess-after-e7e5.png' });
    }
  }
  
  console.log('\n🤖 Test du mode IA\n');
  
  await page.click('[data-mode="ai"]');
  await page.waitForTimeout(1000);
  
  const aiModeActive = await page.evaluate(() => {
    const btn = document.querySelector('[data-mode="ai"]');
    return btn ? btn.classList.contains('active') : false;
  });
  
  console.log(`   Mode IA activé: ${aiModeActive ? '✓' : '✗'}`);
  
  await page.click('#btn-new-game');
  await page.waitForTimeout(500);
  
  console.log('   Nouvelle partie lancée');
  
  await page.screenshot({ path: 'screenshots/chess-ai-mode.png' });
  console.log('   📸 screenshots/chess-ai-mode.png');
  
  console.log('\n📱 Test mobile (375x812)\n');
  
  await page.setViewport({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'screenshots/chess-mobile-final.png' });
  console.log('   📸 screenshots/chess-mobile-final.png');
  
  await browser.close();
  
  console.log('\n✅ Tests terminés!');
}

testChessMoves().catch(console.error);
