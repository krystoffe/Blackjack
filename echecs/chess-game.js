/**
 * Jeu d'échecs 3D avec Three.js et chess.js
 * Plateau 3D, pièces procédurales, animations, IA minimax
 */

(function() {
  'use strict';

  const pieceUnicode = {
    white: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    black: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  let scene, camera, renderer, controls;
  let board3D = [];
  let selectedSquare = null;
  let legalMoves = [];
  let game;
  let gameMode = '2player';
  let aiColor = 'black';
  let aiDepth = 2;
  let isAiThinking = false;
  let animating = false;
  let moveHistory = [];
  
  const SQUARE_SIZE = 1;
  const BOARD_OFFSET = 3.5;

  function init() {
    game = new Chess();
    
    setupScene();
    createBoard();
    createPieces();
    setupControls();
    setupEventListeners();
    updateUI();
    animate();
    
    if (gameMode === 'ai' && aiColor === 'white' && game.turn() === 'w') {
      setTimeout(makeAIMove, 500);
    }
  }

  function setupScene() {
    const container = document.getElementById('chess-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1410);
    scene.fog = new THREE.Fog(0x1a1410, 15, 30);

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 12, 12);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xf0d78c, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xd4af37, 0.5, 20);
    rimLight.position.set(0, 8, -8);
    scene.add(rimLight);

    window.addEventListener('resize', onWindowResize);
  }

  function setupControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function createBoard() {
    const boardGroup = new THREE.Group();
    
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.7,
      metalness: 0.1
    });
    const baseGeometry = new THREE.BoxGeometry(9, 0.5, 9);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.35;
    base.receiveShadow = true;
    boardGroup.add(base);

    const lightSquareMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0d9b5,
      roughness: 0.6,
      metalness: 0.05
    });
    const darkSquareMaterial = new THREE.MeshStandardMaterial({
      color: 0xb58863,
      roughness: 0.6,
      metalness: 0.05
    });

    for (let row = 0; row < 8; row++) {
      board3D[row] = [];
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const material = isLight ? lightSquareMaterial : darkSquareMaterial;
        
        const geometry = new THREE.BoxGeometry(SQUARE_SIZE, 0.1, SQUARE_SIZE);
        const square = new THREE.Mesh(geometry, material);
        
        const x = col * SQUARE_SIZE - BOARD_OFFSET;
        const z = row * SQUARE_SIZE - BOARD_OFFSET;
        square.position.set(x, 0, z);
        square.receiveShadow = true;
        
        square.userData = { row, col, file: String.fromCharCode(97 + col), rank: 8 - row };
        
        boardGroup.add(square);
        board3D[row][col] = { square, piece: null };
      }
    }

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.8,
      metalness: 0.1
    });
    const edgeHeight = 0.3;
    const edgeThickness = 0.15;

    const edges = [
      { w: 8, h: edgeHeight, d: edgeThickness, x: 0, y: edgeHeight/2 - 0.1, z: -4.5 - edgeThickness/2 },
      { w: 8, h: edgeHeight, d: edgeThickness, x: 0, y: edgeHeight/2 - 0.1, z: 4.5 + edgeThickness/2 },
      { w: edgeThickness, h: edgeHeight, d: 8 + edgeThickness * 2, x: -4.5 - edgeThickness/2, y: edgeHeight/2 - 0.1, z: 0 },
      { w: edgeThickness, h: edgeHeight, d: 8 + edgeThickness * 2, x: 4.5 + edgeThickness/2, y: edgeHeight/2 - 0.1, z: 0 }
    ];

    edges.forEach(e => {
      const geo = new THREE.BoxGeometry(e.w, e.h, e.d);
      const edge = new THREE.Mesh(geo, edgeMaterial);
      edge.position.set(e.x, e.y, e.z);
      edge.castShadow = true;
      edge.receiveShadow = true;
      boardGroup.add(edge);
    });

    scene.add(boardGroup);
  }

  function createPieceMesh(type, color) {
    const isWhite = color === 'white';
    const material = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xf8f8f0 : 0x2c2c2c,
      roughness: 0.4,
      metalness: 0.2
    });

    const group = new THREE.Group();
    
    const baseRadius = 0.35;
    const baseHeight = 0.1;
    const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius * 1.1, baseHeight, 16);
    const base = new THREE.Mesh(baseGeo, material);
    base.castShadow = true;
    group.add(base);

    switch(type) {
      case 'p': {
        const bodyGeo = new THREE.SphereGeometry(0.25, 12, 12);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.35;
        body.scale.y = 1.3;
        body.castShadow = true;
        group.add(body);

        const topGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const top = new THREE.Mesh(topGeo, material);
        top.position.y = 0.7;
        top.castShadow = true;
        group.add(top);
        break;
      }
      case 'n': {
        const neckGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 12);
        const neck = new THREE.Mesh(neckGeo, material);
        neck.position.y = 0.3;
        neck.castShadow = true;
        group.add(neck);

        const headGeo = new THREE.BoxGeometry(0.3, 0.4, 0.35);
        const head = new THREE.Mesh(headGeo, material);
        head.position.set(0.15, 0.7, 0);
        head.rotation.y = Math.PI / 6;
        head.castShadow = true;
        group.add(head);

        const earGeo = new THREE.ConeGeometry(0.1, 0.2, 6);
        const ear = new THREE.Mesh(earGeo, material);
        ear.position.set(0.15, 0.95, 0);
        ear.castShadow = true;
        group.add(ear);
        break;
      }
      case 'b': {
        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.32, 0.6, 12);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.35;
        body.castShadow = true;
        group.add(body);

        const topGeo = new THREE.SphereGeometry(0.22, 12, 12);
        const top = new THREE.Mesh(topGeo, material);
        top.position.y = 0.8;
        top.castShadow = true;
        group.add(top);

        const cutGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const cut = new THREE.Mesh(cutGeo, material);
        cut.position.y = 1.05;
        cut.castShadow = true;
        group.add(cut);
        break;
      }
      case 'r': {
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.33, 0.7, 12);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.4;
        body.castShadow = true;
        group.add(body);

        const topGeo = new THREE.CylinderGeometry(0.32, 0.3, 0.15, 12);
        const top = new THREE.Mesh(topGeo, material);
        top.position.y = 0.85;
        top.castShadow = true;
        group.add(top);

        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const battlementGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1);
          const battlement = new THREE.Mesh(battlementGeo, material);
          battlement.position.set(
            Math.cos(angle) * 0.25,
            1.0,
            Math.sin(angle) * 0.25
          );
          battlement.castShadow = true;
          group.add(battlement);
        }
        break;
      }
      case 'q': {
        const bodyGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.8, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.45;
        body.castShadow = true;
        group.add(body);

        const crownGeo = new THREE.SphereGeometry(0.25, 12, 12);
        const crown = new THREE.Mesh(crownGeo, material);
        crown.position.y = 1.0;
        crown.scale.y = 0.6;
        crown.castShadow = true;
        group.add(crown);

        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          const spikeGeo = new THREE.ConeGeometry(0.06, 0.25, 6);
          const spike = new THREE.Mesh(spikeGeo, material);
          spike.position.set(
            Math.cos(angle) * 0.22,
            1.25,
            Math.sin(angle) * 0.22
          );
          spike.castShadow = true;
          group.add(spike);
        }
        break;
      }
      case 'k': {
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.36, 0.9, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);

        const crownGeo = new THREE.CylinderGeometry(0.28, 0.25, 0.2, 16);
        const crown = new THREE.Mesh(crownGeo, material);
        crown.position.y = 1.1;
        crown.castShadow = true;
        group.add(crown);

        const crossVGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
        const crossV = new THREE.Mesh(crossVGeo, material);
        crossV.position.y = 1.4;
        crossV.castShadow = true;
        group.add(crossV);

        const crossHGeo = new THREE.BoxGeometry(0.25, 0.08, 0.08);
        const crossH = new THREE.Mesh(crossHGeo, material);
        crossH.position.y = 1.45;
        crossH.castShadow = true;
        group.add(crossH);
        break;
      }
    }

    group.userData = { type, color };
    return group;
  }

  function createPieces() {
    const fen = game.fen();
    const rows = fen.split(' ')[0].split('/');
    
    rows.forEach((row, rowIndex) => {
      let colIndex = 0;
      for (const char of row) {
        if (isNaN(char)) {
          const isWhite = char === char.toUpperCase();
          const type = char.toLowerCase();
          const color = isWhite ? 'white' : 'black';
          
          const piece = createPieceMesh(type, color);
          const x = colIndex * SQUARE_SIZE - BOARD_OFFSET;
          const z = rowIndex * SQUARE_SIZE - BOARD_OFFSET;
          piece.position.set(x, 0.05, z);
          
          scene.add(piece);
          board3D[rowIndex][colIndex].piece = piece;
          
          colIndex++;
        } else {
          colIndex += parseInt(char);
        }
      }
    });
  }

  function clearPieces() {
    board3D.forEach(row => {
      row.forEach(cell => {
        if (cell.piece) {
          scene.remove(cell.piece);
          cell.piece = null;
        }
      });
    });
  }

  function setupEventListeners() {
    renderer.domElement.addEventListener('click', onBoardClick);
    renderer.domElement.addEventListener('touchend', onBoardClick);
    
    document.getElementById('btn-new-game').addEventListener('click', newGame);
    document.getElementById('btn-undo').addEventListener('click', undoMove);
    document.getElementById('btn-reset-camera').addEventListener('click', resetCamera);
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;
        document.getElementById('ai-settings').style.display = gameMode === 'ai' ? 'block' : 'none';
        newGame();
      });
    });
    
    document.getElementById('ai-difficulty').addEventListener('change', (e) => {
      aiDepth = parseInt(e.target.value);
    });
    
    document.querySelectorAll('input[name="ai-color"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        aiColor = e.target.value;
        newGame();
      });
    });
  }

  function onBoardClick(event) {
    if (animating || isAiThinking) return;
    if (gameMode === 'ai' && game.turn() === aiColor[0]) return;

    event.preventDefault();
    
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX || event.changedTouches[0].clientX) - rect.left) / rect.width * 2 - 1;
    const y = -((event.clientY || event.changedTouches[0].clientY) - rect.top) / rect.height * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const intersect of intersects) {
      let target = intersect.object;
      while (target.parent && !target.userData.row && target.userData.row !== 0) {
        target = target.parent;
      }
      
      if (target.userData.row !== undefined) {
        handleSquareClick(target.userData);
        break;
      }
    }
  }

  function handleSquareClick(squareData) {
    const square = squareData.file + squareData.rank;
    
    if (selectedSquare) {
      const from = selectedSquare;
      const to = square;
      
      if (legalMoves.includes(to)) {
        const move = { from, to };
        
        const piece = game.get(from);
        if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) {
          showPromotionModal(from, to);
          return;
        }
        
        makeMove(move);
      } else {
        clearHighlights();
        
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          selectSquare(square);
        } else {
          selectedSquare = null;
        }
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        selectSquare(square);
      }
    }
  }

  function selectSquare(square) {
    selectedSquare = square;
    legalMoves = game.moves({ square, verbose: true }).map(m => m.to);
    highlightSquares();
  }

  function highlightSquares() {
    clearHighlights();
    
    if (!selectedSquare) return;
    
    const file = selectedSquare.charCodeAt(0) - 97;
    const rank = 8 - parseInt(selectedSquare[1]);
    
    const selectedMat = new THREE.MeshStandardMaterial({
      color: 0x7fc97f,
      roughness: 0.6,
      metalness: 0.05,
      emissive: 0x3a5f3a,
      emissiveIntensity: 0.3
    });
    board3D[rank][file].square.material = selectedMat;
    board3D[rank][file].originalMaterial = board3D[rank][file].square.material;
    
    legalMoves.forEach(move => {
      const f = move.charCodeAt(0) - 97;
      const r = 8 - parseInt(move[1]);
      
      const moveMat = new THREE.MeshStandardMaterial({
        color: 0xffeb3b,
        roughness: 0.6,
        metalness: 0.05,
        emissive: 0x857a1f,
        emissiveIntensity: 0.4
      });
      board3D[r][f].square.material = moveMat;
      board3D[r][f].originalMaterial = board3D[r][f].square.material;
    });
  }

  function clearHighlights() {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const color = isLight ? 0xf0d9b5 : 0xb58863;
        board3D[row][col].square.material = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0.05
        });
      }
    }
  }

  function makeMove(move) {
    const result = game.move(move);
    if (!result) return;
    
    animating = true;
    moveHistory.push(result.san);
    
    const fromFile = move.from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(move.from[1]);
    const toFile = move.to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(move.to[1]);
    
    const piece = board3D[fromRank][fromFile].piece;
    const captured = board3D[toRank][toFile].piece;
    
    if (captured) {
      scene.remove(captured);
      addCapturedPiece(captured.userData.type, captured.userData.color);
    }
    
    if (result.flags.includes('e')) {
      const epRank = result.color === 'w' ? toRank + 1 : toRank - 1;
      const epPawn = board3D[epRank][toFile].piece;
      if (epPawn) {
        scene.remove(epPawn);
        board3D[epRank][toFile].piece = null;
        addCapturedPiece('p', epPawn.userData.color);
      }
    }
    
    if (result.flags.includes('k') || result.flags.includes('q')) {
      let rookFromFile, rookToFile;
      if (result.flags.includes('k')) {
        rookFromFile = 7;
        rookToFile = 5;
      } else {
        rookFromFile = 0;
        rookToFile = 3;
      }
      const rookRank = fromRank;
      const rook = board3D[rookRank][rookFromFile].piece;
      if (rook) {
        const targetX = rookToFile * SQUARE_SIZE - BOARD_OFFSET;
        animatePiece(rook, targetX, rook.position.z, () => {});
        board3D[rookRank][rookToFile].piece = rook;
        board3D[rookRank][rookFromFile].piece = null;
      }
    }
    
    const targetX = toFile * SQUARE_SIZE - BOARD_OFFSET;
    const targetZ = toRank * SQUARE_SIZE - BOARD_OFFSET;
    
    animatePiece(piece, targetX, targetZ, () => {
      if (result.promotion) {
        scene.remove(piece);
        const newPiece = createPieceMesh(result.promotion, result.color === 'w' ? 'white' : 'black');
        newPiece.position.set(targetX, 0.05, targetZ);
        scene.add(newPiece);
        board3D[toRank][toFile].piece = newPiece;
      } else {
        board3D[toRank][toFile].piece = piece;
      }
      
      board3D[fromRank][fromFile].piece = null;
      
      clearHighlights();
      selectedSquare = null;
      legalMoves = [];
      animating = false;
      
      updateUI();
      
      if (gameMode === 'ai' && !game.game_over() && game.turn() === aiColor[0]) {
        setTimeout(makeAIMove, 500);
      }
    });
  }

  function animatePiece(piece, targetX, targetZ, callback) {
    const startX = piece.position.x;
    const startZ = piece.position.z;
    const duration = 400;
    const startTime = Date.now();
    
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      piece.position.x = startX + (targetX - startX) * eased;
      piece.position.z = startZ + (targetZ - startZ) * eased;
      piece.position.y = 0.05 + Math.sin(progress * Math.PI) * 0.5;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        piece.position.y = 0.05;
        callback();
      }
    }
    
    animate();
  }

  function showPromotionModal(from, to) {
    const modal = document.getElementById('promotion-modal');
    const choices = document.getElementById('promotion-choices');
    choices.innerHTML = '';
    
    const pieces = ['q', 'r', 'b', 'n'];
    const color = game.turn();
    const colorName = color === 'w' ? 'white' : 'black';
    
    pieces.forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'promotion-piece';
      btn.textContent = pieceUnicode[colorName][type];
      btn.onclick = () => {
        modal.style.display = 'none';
        makeMove({ from, to, promotion: type });
      };
      choices.appendChild(btn);
    });
    
    modal.style.display = 'flex';
  }

  function addCapturedPiece(type, color) {
    const container = document.getElementById(color === 'white' ? 'captured-white' : 'captured-black');
    const span = document.createElement('span');
    span.textContent = pieceUnicode[color][type];
    span.style.opacity = '0';
    container.appendChild(span);
    setTimeout(() => span.style.opacity = '1', 10);
  }

  function makeAIMove() {
    if (game.game_over() || isAiThinking) return;
    
    isAiThinking = true;
    updateUI();
    
    setTimeout(() => {
      const bestMove = getBestMove(game, aiDepth);
      if (bestMove) {
        makeMove(bestMove);
      }
      isAiThinking = false;
    }, 300);
  }

  function getBestMove(game, depth) {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;
    
    let bestMove = null;
    let bestValue = -Infinity;
    const isMaximizing = game.turn() === aiColor[0];
    
    moves.forEach(move => {
      game.move(move);
      const value = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing, aiColor[0]);
      game.undo();
      
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
    });
    
    return bestMove;
  }

  function minimax(game, depth, alpha, beta, isMaximizing, aiColor) {
    if (depth === 0 || game.game_over()) {
      return evaluateBoard(game, aiColor);
    }
    
    const moves = game.moves({ verbose: true });
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        game.move(move);
        const evaluation = minimax(game, depth - 1, alpha, beta, false, aiColor);
        game.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        game.move(move);
        const evaluation = minimax(game, depth - 1, alpha, beta, true, aiColor);
        game.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function evaluateBoard(game, aiColor) {
    if (game.in_checkmate()) {
      return game.turn() === aiColor ? -10000 : 10000;
    }
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
      return 0;
    }
    
    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    
    let score = 0;
    const board = game.board();
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const value = pieceValues[piece.type];
          const multiplier = piece.color === aiColor ? 1 : -1;
          score += value * multiplier;
          
          if (piece.type === 'p') {
            const advancement = piece.color === 'w' ? (7 - i) : i;
            score += advancement * 10 * multiplier;
          }
          
          if (piece.type === 'n' || piece.type === 'b') {
            if (i >= 2 && i <= 5 && j >= 2 && j <= 5) {
              score += 20 * multiplier;
            }
          }
        }
      }
    }
    
    return score;
  }

  function undoMove() {
    if (game.history().length === 0 || animating || isAiThinking) return;
    
    game.undo();
    moveHistory.pop();
    
    if (gameMode === 'ai' && game.history().length > 0) {
      game.undo();
      moveHistory.pop();
    }
    
    clearPieces();
    createPieces();
    clearHighlights();
    selectedSquare = null;
    updateUI();
  }

  function newGame() {
    game.reset();
    moveHistory = [];
    clearPieces();
    createPieces();
    clearHighlights();
    selectedSquare = null;
    animating = false;
    isAiThinking = false;
    updateUI();
    
    if (gameMode === 'ai' && aiColor === 'white') {
      setTimeout(makeAIMove, 500);
    }
  }

  function resetCamera() {
    camera.position.set(0, 12, 12);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function updateUI() {
    const turn = game.turn() === 'w' ? 'Blancs' : 'Noirs';
    const turnPiece = game.turn() === 'w' ? '♔' : '♚';
    document.getElementById('turn-indicator').innerHTML = `
      <span class="turn-piece">${turnPiece}</span>
      <span>Tour des ${turn}</span>
    `;
    
    let statusText = '';
    if (isAiThinking) {
      statusText = '🤔 L\'IA réfléchit...';
    } else if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? 'Noirs' : 'Blancs';
      statusText = `🏆 Échec et mat ! Les ${winner} gagnent !`;
    } else if (game.in_draw()) {
      statusText = '🤝 Match nul !';
    } else if (game.in_stalemate()) {
      statusText = '🤝 Pat ! Match nul.';
    } else if (game.in_threefold_repetition()) {
      statusText = '🤝 Triple répétition ! Match nul.';
    } else if (game.insufficient_material()) {
      statusText = '🤝 Matériel insuffisant ! Match nul.';
    } else if (game.in_check()) {
      statusText = '⚠️ Échec !';
    }
    document.getElementById('game-status').textContent = statusText;
    
    const undoBtn = document.getElementById('btn-undo');
    undoBtn.disabled = game.history().length === 0 || animating || isAiThinking;
    
    const movesList = document.getElementById('moves-list');
    movesList.innerHTML = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const white = moveHistory[i];
      const black = moveHistory[i + 1] || '';
      
      const pair = document.createElement('div');
      pair.className = 'move-pair';
      pair.innerHTML = `
        <span class="move-number">${moveNum}.</span>
        <span>${white}</span>
        ${black ? `<span>${black}</span>` : ''}
      `;
      movesList.appendChild(pair);
    }
    movesList.scrollTop = movesList.scrollHeight;
    
    document.getElementById('captured-white').querySelectorAll('span').forEach(el => {
      el.style.transition = 'opacity 0.3s ease';
    });
    document.getElementById('captured-black').querySelectorAll('span').forEach(el => {
      el.style.transition = 'opacity 0.3s ease';
    });
  }

  function onWindowResize() {
    const container = document.getElementById('chess-container');
    const aspect = container.clientWidth / container.clientHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
