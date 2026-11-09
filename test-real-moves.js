/**
 * Test RÉEL des mouvements avec l'API de test et clics projetés
 */

const puppeteer = require('puppeteer');
const PORT = 8899;

async function testRealMoves() {
  console.log('♟️  TEST RÉEL DES MOUVEMENTS D\'ÉCHECS\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist'
    ]
  });
  
  console.log('📱 TEST MOBILE (390x844)\n');
  
  let page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  await page.goto(`http://localhost:${PORT}/echecs/`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  console.log('   Attente de l\'initialisation...');
  await page.waitForTimeout(5000);
  
  const mobileCheck = await page.evaluate(() => {
    const container = document.getElementById('chess-container');
    const canvas = container ? container.querySelector('canvas') : null;
    
    return {
      containerExists: !!container,
      containerSize: container ? {
        w: container.offsetWidth,
        h: container.offsetHeight,
        display: window.getComputedStyle(container).display
      } : null,
      canvasExists: !!canvas,
      canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
      testApiReady: typeof window.__chessTest !== 'undefined',
      gameReady: window.__chessTest ? window.__chessTest.isReady() : false
    };
  });
  
  console.log('   Container:', JSON.stringify(mobileCheck.containerSize));
  console.log('   Canvas:', mobileCheck.canvasExists ? JSON.stringify(mobileCheck.canvasSize) : '❌ Absent');
  console.log('   Test API:', mobileCheck.testApiReady ? '✓' : '❌');
  console.log('   Jeu prêt:', mobileCheck.gameReady ? '✓' : '❌');
  
  if (!mobileCheck.canvasSize || mobileCheck.canvasSize.h === 0) {
    console.log('\n   ❌ BLOCKER: Canvas has 0 height on mobile!\n');
  }
  
  await page.screenshot({ path: 'screenshots/chess-mobile-v2.png' });
  console.log('   📸 screenshots/chess-mobile-v2.png\n');
  
  await page.close();
  
  console.log('🖥️  TEST DESKTOP (1280x800)\n');
  
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto(`http://localhost:${PORT}/echecs/`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await page.waitForTimeout(5000);
  
  console.log('   Vérification du plateau...');
  
  const desktopCheck = await page.evaluate(() => {
    const container = document.getElementById('chess-container');
    const canvas = container ? container.querySelector('canvas') : null;
    
    return {
      containerSize: container ? {
        w: container.offsetWidth,
        h: container.offsetHeight
      } : null,
      canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
      gameReady: window.__chessTest ? window.__chessTest.isReady() : false
    };
  });
  
  console.log('   Container:', JSON.stringify(desktopCheck.containerSize));
  console.log('   Canvas:', JSON.stringify(desktopCheck.canvasSize));
  console.log('   Jeu prêt:', desktopCheck.gameReady ? '✓' : '❌\n');
  
  await page.screenshot({ path: 'screenshots/chess-desktop-v2.png' });
  console.log('   📸 screenshots/chess-desktop-v2.png\n');
  
  if (!desktopCheck.gameReady) {
    console.log('   ❌ Jeu non prêt, skip tests mouvements\n');
    await browser.close();
    return;
  }
  
  console.log('🎯 TEST DES MOUVEMENTS VIA API\n');
  
  console.log('   1. Mouvement e2-e4 (Blancs) via API...');
  
  const move1 = await page.evaluate(() => {
    return window.__chessTest.move('e2', 'e4');
  });
  
  console.log('   Résultat:', JSON.stringify(move1));
  
  if (!move1.success) {
    console.log('   ❌ Échec du mouvement\n');
  } else {
    console.log('   ✓ Coup joué:', move1.move);
    console.log('   Tour suivant:', move1.turn === 'b' ? '✓ Noirs' : '❌ ' + move1.turn);
    
    await page.waitForTimeout(3000);
    
    const move2Check = await page.evaluate(() => {
      const moves = document.querySelector('#moves-list');
      return {
        movesHTML: moves ? moves.innerHTML : '',
        movesCount: moves ? moves.children.length : 0
      };
    });
    
    console.log('   Coups dans historique:', move2Check.movesCount);
    console.log('   Historique contient "e4":', move2Check.movesHTML.includes('e4') ? '✓' : '❌');
    
    console.log('\n   2. Attente réponse IA...');
    await page.waitForTimeout(3000);
    
    const afterAI = await page.evaluate(() => {
      const moves = document.querySelector('#moves-list');
      const turn = document.querySelector('#turn-indicator');
      return {
        movesCount: moves ? moves.children.length : 0,
        turnText: turn ? turn.textContent.trim() : '',
        fen: window.__chessTest.fen()
      };
    });
    
    console.log('   Coups totaux:', afterAI.movesCount);
    console.log('   IA a répondu:', afterAI.movesCount >= 1 ? '✓ Oui' : '❌ Non');
    console.log('   Tour actuel:', afterAI.turnText);
    
    await page.screenshot({ path: 'screenshots/chess-after-e4-ai-response.png' });
    console.log('   📸 screenshots/chess-after-e4-ai-response.png\n');
  }
  
  console.log('🖱️  TEST DES MOUVEMENTS PAR CLIC PROJETÉ\n');
  
  await page.goto(`http://localhost:${PORT}/echecs/`, {
    waitUntil: 'networkidle2'
  });
  await page.waitForTimeout(5000);
  
  console.log('   Nouvelle partie démarrée');
  console.log('   Calcul positions écran des cases...');
  
  const squarePositions = await page.evaluate(() => {
    const positions = {};
    const squares = ['e2', 'e4', 'd7', 'd5'];
    
    for (const sq of squares) {
      const pos = window.__chessTest.getSquareScreenPos(sq);
      if (pos) {
        const container = document.getElementById('chess-container');
        const rect = container.getBoundingClientRect();
        positions[sq] = {
          screenX: rect.left + pos.x,
          screenY: rect.top + pos.y
        };
      }
    }
    
    return positions;
  });
  
  console.log('   Positions:', JSON.stringify(squarePositions, null, 2));
  
  if (squarePositions.e2 && squarePositions.e4) {
    console.log('\n   Clic sur e2...');
    await page.mouse.click(squarePositions.e2.screenX, squarePositions.e2.screenY);
    await page.waitForTimeout(500);
    
    console.log('   Clic sur e4...');
    await page.mouse.click(squarePositions.e4.screenX, squarePositions.e4.screenY);
    await page.waitForTimeout(2000);
    
    const clickResult = await page.evaluate(() => {
      const moves = document.querySelector('#moves-list');
      return {
        movesCount: moves ? moves.children.length : 0,
        movesHTML: moves ? moves.innerHTML : ''
      };
    });
    
    console.log('   Coups après clic:', clickResult.movesCount);
    console.log('   Coup visible:', clickResult.movesHTML.includes('e4') || clickResult.movesHTML.includes('1.') ? '✓' : '❌');
    
    await page.waitForTimeout(2500);
    
    const afterClickAI = await page.evaluate(() => {
      const moves = document.querySelector('#moves-list');
      return moves ? moves.children.length : 0;
    });
    
    console.log('   IA a répondu:', afterClickAI >= 1 ? '✓ Oui' : '❌ Non');
    
    await page.screenshot({ path: 'screenshots/chess-after-click-moves.png' });
    console.log('   📸 screenshots/chess-after-click-moves.png');
  }
  
  console.log('\n📱 TEST MOBILE APRÈS MOUVEMENTS\n');
  
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'screenshots/chess-mobile-after-moves.png' });
  console.log('   📸 screenshots/chess-mobile-after-moves.png');
  
  await browser.close();
  
  console.log('\n✅ Tests terminés!');
}

testRealMoves().catch(console.error);
