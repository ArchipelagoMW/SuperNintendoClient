window.addEventListener('load', () => {
  const header = document.getElementById('header');
  const sidebar = document.getElementById('sidebar');
  document.getElementById('client-version').innerText =
    `${CLIENT_VERSION.state} ${CLIENT_VERSION.major}.${CLIENT_VERSION.minor}.${CLIENT_VERSION.patch}`;

  // Allow the user to change the size of the font in the console window
  document.getElementById('small-text').addEventListener('click', () => setFontSize(12));
  document.getElementById('medium-text').addEventListener('click', () => setFontSize(16));
  document.getElementById('large-text').addEventListener('click', () => setFontSize(20));

  // Include a toggle for terminal mode
  document.body.addEventListener('keydown', (evt) => {
    if (evt.ctrlKey && evt.key === 't'){
      if (document.body.classList.contains('terminal-mode')){
        header.style.display = 'flex';
        sidebar.style.display = 'flex';
        sidebar.classList.remove('hidden');
        return document.body.classList.remove('terminal-mode');
      }

      header.style.display = 'none';
      sidebar.style.display = 'none';
      sidebar.classList.add('hidden');
      document.body.classList.add('terminal-mode');
    }
  });

  // Allow the user to press a button to pause receiving items (a.k.a. Malmo Mode)
  document.getElementById('receive-items-toggle').addEventListener('click', (evt) => {
    receiveItems ? disableReceivingItems() : enableReceivingItems();
  });
});

const disableReceivingItems = () => {
  const receiveItemsStatus = document.getElementById('receive-items-status');
  receiveItems = false;
  receiveItemsStatus.innerText = 'Disabled';
  receiveItemsStatus.classList.remove('enabled');
  receiveItemsStatus.classList.add('disabled');
  appendConsoleMessage('You are no longer receiving items from other players. Items found in your ' +
    ' world will still be sent.');
};

const enableReceivingItems = () => {
  const receiveItemsStatus = document.getElementById('receive-items-status');
  receiveItems = true;
  receiveItemsStatus.innerText = 'Enabled';
  receiveItemsStatus.classList.remove('disabled');
  receiveItemsStatus.classList.add('enabled');
  appendConsoleMessage('You are now receiving items from other players.');
};

// Allow the user to change the size of text in the console window
const setFontSize = (size) => {
  if (!size || parseInt(size, 10) < 1) {
    return appendConsoleMessage('Font size must be an integer greater than zero.');
  }
  document.getElementById('console-output-wrapper').style.fontSize = `${parseInt(size, 10)}px`;
};