window.addEventListener('load', async () => {
  const response = await fetch('games/games.json');
  const games = await response.json();

  const gameList = document.getElementById('game-list');
  Object.keys(games).forEach((game) => {
    // Create a div to contain the game
    const gameDiv = document.createElement('div');
    gameDiv.classList.add('game');

    // Add the game's icon to the div
    const gameImg = document.createElement('img');
    gameImg.setAttribute('src', `games/${game}/icon.ico`);

    // Add the game's name to the div
    const gameName = document.createElement('span');
    gameName.innerText = game;

    // Assemble the div and add it to the DOM
    gameDiv.appendChild(gameImg);
    gameDiv.appendChild(gameName);
    gameList.appendChild(gameDiv);
  });
});