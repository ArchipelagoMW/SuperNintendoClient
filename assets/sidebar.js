window.addEventListener('load', () => {
  // Allow the user to toggle the sidebar
  document.getElementById('sidebar-toggle-button').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const collapseButton = document.getElementById('sidebar-toggle-button');
    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      return collapseButton.innerText = '↪';
    }
    sidebar.classList.add('collapsed');
    collapseButton.innerText = '↩';
  });

  // Load saved notes and update saved notes when a user changes their value
  const notesBox = document.getElementById('notes');
  const loadedNotes = localStorage.getItem('notes');
  if (loadedNotes) {notesBox.value = loadedNotes; }
  notesBox.addEventListener('keyup', (event) => {
    localStorage.setItem('notes', event.target.value);
  });
});