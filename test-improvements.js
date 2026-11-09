/**
 * Test des améliorations : mode IA par défaut, mouvements, taille, caméra
 */

const puppeteer = require('puppeteer');
const PORT = 8899;

async function testImprovements() {
  console.log('🎯 Test des améliorations du jeu d\'échecs\n');
  
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
  
  console.log('📱 Test MOBILE (390x844)\n');
  
  let page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  await page.goto(`http://localhost:${PORT}/echecs/`, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  await page.waitForTimeout(5000);
  
  const mobileInfo = await page.evaluate(() => {
    const canvas = document.querySelector('#chess-container canvas');
    const aiBtn = document.querySelector('[data-mode="ai"]');
    const aiSettings = document.getElementById('ai-settings');
    const difficultySelect = document.getElementById('ai-difficulty');
    const aiColorRadio = document.querySelector('input[name="ai-color"]:checked');
    const turnText = document.querySelector('#turn-indicator');
    
    return {
      canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
      containerSize: canvas ? { 
        w: canvas.parentElement.offsetWidth,
        h: canvas.parentElement.offsetHeight 
      } : null,
      aiModeActive: aiBtn ? aiBtn.classList.contains('active') : false,
      aiSettingsVisible: aiSettings ? window.getComputedStyle(aiSettings).display !== 'none' : false,
      difficulty: difficultySelect ? difficultySelect.value : null,
      aiColor: aiColorRadio ? aiColorRadio.value : null,
      turn: turnText ? turnText.textContent.trim() : null
    };
  });
  
  console.log('   Mode IA par défaut:', mobileInfo.aiModeActive ? '✓ Actif' : '✗ Inactif');
  console.log('   Paramètres IA visibles:', mobileInfo.aiSettingsVisible ? '✓' : '✗');
  console.log('   Difficulté:', mobileInfo.difficulty === '1' ? '✓ Facile (1)' : `✗ ${mobileInfo.difficulty}`);
  console.log('   Couleur IA:', mobileInfo.aiColor === 'black' ? '✓ Noir (joueur=Blanc)' : `✗ ${mobileInfo.aiColor}`);
  console.log('   Tour actuel:', mobileInfo.turn);
  console.log(`   Taille canvas: ${mobileInfo.canvasSize?.w}x${mobileInfo.canvasSize?.h}`);
  console.log(`   Taille container: ${mobileInfo.containerSize?.w}x${mobileInfo.containerSize?.h}`);
  
  await page.screenshot({ path: 'screenshots/chess-mobile-improved.png', fullPage: false });
  console.log('   📸 screenshots/chess-mobile-improved.png\n');
  
  await page.close();
  
  console.log('🖥️  Test DESKTOP (1280x800)\n');
  
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto(`http://localhost:${PORT}/echecs/`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  await page.waitForTimeout(5000);
  
  const desktopInfo = await page.evaluate(() => {
    const canvas = document.querySelector('#chess-container canvas');
    const turnText = document.querySelector('#turn-indicator');
    
    return {
      canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
      containerSize: canvas ? {
        w: canvas.parentElement.offsetWidth,
        h: canvas.parentElement.offsetHeight
      } : null,
      turn: turnText ? turnText.textContent.trim() : null
    };
  });
  
  console.log(`   Taille canvas: ${desktopInfo.canvasSize?.w}x${desktopInfo.canvasSize?.h}`);
  console.log(`   Taille container: ${desktopInfo.containerSize?.w}x${desktopInfo.containerSize?.h}`);
  console.log('   Plateau agrandi:', desktopInfo.containerSize?.w > 700 ? '✓ Oui' : '✗ Non');
  console.log('   Tour:', desktopInfo.turn);
  
  await page.screenshot({ path: 'screenshots/chess-desktop-improved.png', fullPage: false });
  console.log('   📸 screenshots/chess-desktop-improved.png\n');
  
  console.log('♟️  Test des MOUVEMENTS contre IA\n');
  
  console.log('   Tentative de jouer e2-e4...');
  
  const moveResult = await page.evaluate(() => {
    return new Promise((resolve) => {
      const container = document.getElementById('chess-container');
      if (!container) {
        resolve({ error: 'Container non trouvé' });
        return;
      }
      
      const rect = container.getBoundingClientRect();
      
      const e2X = rect.left + rect.width * 0.625;
      const e2Y = rect.top + rect.height * 0.875;
      const e4X = rect.left + rect.width * 0.625;
      const e4Y = rect.top + rect.height * 0.625;
      
      const canvas = container.querySelector('canvas');
      if (!canvas) {
        resolve({ error: 'Canvas non trouvé' });
        return;
      }
      
      const evt1 = new MouseEvent('click', {
        clientX: e2X,
        clientY: e2Y,
        bubbles: true
      });
      canvas.dispatchEvent(evt1);
      
      setTimeout(() => {
        const evt2 = new MouseEvent('click', {
          clientX: e4X,
          clientY: e4Y,
          bubbles: true
        });
        canvas.dispatchEvent(evt2);
        
        setTimeout(() => {
          const turnText = document.querySelector('#turn-indicator');
          const moves = document.querySelector('#moves-list');
          
          resolve({
            success: true,
            turn: turnText ? turnText.textContent.trim() : 'N/A',
            movesHTML: moves ? moves.innerHTML : 'N/A',
            movesCount: moves ? moves.children.length : 0
          });
        }, 2500);
      }, 500);
    });
  });
  
  if (moveResult.error) {
    console.log(`   ✗ ${moveResult.error}`);
  } else {
    console.log('   Coup joué');
    console.log('   Tour après coup:', moveResult.turn);
    console.log('   Nombre de coups dans l\'historique:', moveResult.movesCount);
    console.log('   Coup visible:', moveResult.movesHTML.includes('e4') || moveResult.movesHTML.includes('1.') ? '✓' : '✗');
    
    await page.waitForTimeout(3000);
    
    const aiMoved = await page.evaluate(() => {
      const moves = document.querySelector('#moves-list');
      return moves ? moves.children.length : 0;
    });
    
    console.log('   IA a répondu:', aiMoved >= 2 ? '✓ Oui' : '✗ Non');
    console.log('   Coups totaux:', aiMoved);
    
    await page.screenshot({ path: 'screenshots/chess-after-ai-move.png' });
    console.log('   📸 screenshots/chess-after-ai-move.png');
  }
  
  console.log('\n🎬 Capture des screenshots AVANT/APRÈS\n');
  
  await page.goto(`http://localhost:${PORT}/echecs/`, {
    waitUntil: 'networkidle2'
  });
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'screenshots/chess-new-position-start.png' });
  console.log('   📸 Position initiale (nouveau) sauvegardée');
  
  await browser.close();
  
  console.log('\n✅ Tests terminés!');
}

testImprovements().catch(console.error);
