/**
 * Tests headless avec WebGL activé pour vérifier le rendu 3D
 */

const puppeteer = require('puppeteer');
const http = require('http');
const handler = require('serve-handler');
const path = require('path');

const PORT = 8899;

async function testChessRendering(viewport) {
  console.log(`\n🎮 Test rendu Échecs 3D (${viewport.width}x${viewport.height})`);
  
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
  
  const page = await browser.newPage();
  await page.setViewport(viewport);
  
  const errors = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`   ❌ Console error: ${text}`);
      errors.push(text);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`   ❌ Page error: ${error.toString()}`);
    errors.push(error.toString());
  });
  
  try {
    await page.goto(`http://localhost:${PORT}/echecs/`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('   ✓ Page chargée');
    
    await page.waitForTimeout(4000);
    
    const hasCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('#chess-container canvas');
      return canvas !== null;
    });
    
    if (!hasCanvas) {
      console.log('   ❌ Canvas non trouvé');
      errors.push('Canvas non trouvé');
    } else {
      console.log('   ✓ Canvas présent');
    }
    
    const webglSupported = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    });
    
    console.log(`   ${webglSupported ? '✓' : '❌'} WebGL ${webglSupported ? 'supporté' : 'non supporté'}`);
    
    const sceneInfo = await page.evaluate(() => {
      if (typeof THREE === 'undefined') return { error: 'THREE non défini' };
      
      const canvas = document.querySelector('#chess-container canvas');
      if (!canvas) return { error: 'Canvas non trouvé' };
      
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        canvasStyle: { width: canvas.style.width, height: canvas.style.height }
      };
    });
    
    console.log(`   Canvas: ${JSON.stringify(sceneInfo)}`);
    
    const screenshotName = `screenshots/chess-test-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: screenshotName });
    console.log(`   📸 Screenshot: ${screenshotName}`);
    
    if (errors.length === 0) {
      console.log('   ✅ Test réussi');
    }
    
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
    errors.push(error.message);
  }
  
  await page.close();
  await browser.close();
  
  return errors.length === 0;
}

async function testMoves() {
  console.log('\n♟️  Test des mouvements d\'échecs');
  
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
      '--ignore-gpu-blocklist'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    await page.goto(`http://localhost:${PORT}/echecs/`, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(4000);
    
    console.log('   Tentative de coup : e2 → e4');
    
    const moveResult = await page.evaluate(() => {
      const container = document.getElementById('chess-container');
      if (!container) return { error: 'Container non trouvé' };
      
      const rect = container.getBoundingClientRect();
      
      const e2 = { x: rect.left + rect.width * 0.625, y: rect.top + rect.height * 0.75 };
      const e4 = { x: rect.left + rect.width * 0.625, y: rect.top + rect.height * 0.5 };
      
      return { e2, e4, rect: { width: rect.width, height: rect.height } };
    });
    
    if (moveResult.error) {
      console.log(`   ❌ ${moveResult.error}`);
    } else {
      console.log(`   Clic simulé sur e2, puis e4`);
      
      await page.mouse.click(moveResult.e2.x, moveResult.e2.y);
      await page.waitForTimeout(500);
      await page.mouse.click(moveResult.e4.x, moveResult.e4.y);
      await page.waitForTimeout(1500);
      
      const turnText = await page.$eval('#turn-indicator', el => el.textContent);
      console.log(`   Tour actuel: ${turnText.trim()}`);
      
      await page.screenshot({ path: 'screenshots/chess-after-move.png' });
      console.log('   📸 Screenshot après mouvement');
      
      console.log('   ✅ Mouvements testés');
    }
    
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }
  
  await page.close();
  await browser.close();
}

async function main() {
  console.log('🚀 Test WebGL et rendu 3D des Échecs\n');
  
  await testChessRendering({ width: 1280, height: 800 });
  await testChessRendering({ width: 375, height: 812 });
  await testMoves();
  
  console.log('\n✅ Tests terminés');
}

main().catch(console.error);
