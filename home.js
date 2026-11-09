/**
 * Hub Jeux — Configuration et rendu dynamique des jeux
 */

const games = [
  {
    id: 'blackjack',
    title: 'Blackjack',
    icon: '♠♥',
    description: 'Le classique des casinos ! Battez le croupier sans dépasser 21.',
    features: ['Sabot 6 jeux', 'BJ paie 3:2', 'Doubler & Séparer'],
    url: './blackjack/',
    color: '#0d5c3d'
  },
  {
    id: 'echecs',
    title: 'Échecs',
    icon: '♟',
    description: 'Jeu d\'échecs 3D magnifique avec plateau réaliste et pièces animées.',
    features: ['Plateau 3D', '2 joueurs ou IA', 'Règles complètes'],
    url: './echecs/',
    color: '#654321'
  }
];

function renderGames() {
  const grid = document.getElementById('games-grid');
  
  games.forEach((game, index) => {
    const card = document.createElement('a');
    card.className = 'game-card';
    card.href = game.url;
    card.style.animationDelay = `${index * 0.1}s`;
    card.setAttribute('aria-label', `Jouer à ${game.title}`);
    
    card.innerHTML = `
      <div class="game-icon">${game.icon}</div>
      <div class="game-content">
        <h2 class="game-title">${game.title}</h2>
        <p class="game-description">${game.description}</p>
        <div class="game-features">
          ${game.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
        </div>
        <button class="play-button" aria-label="Jouer maintenant">
          Jouer maintenant →
        </button>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', renderGames);
