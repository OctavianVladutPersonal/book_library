/**
 * Application Initialization
 * Main entry point that initializes the entire application
 */

document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    setupEventListeners();

    // Load books for all users (logged in or not)
    loadBooks();

    // Setup authentication state listener to update UI
    setupAuthStateListener((user) => {
        updateView();
    });

    // Initialize autocomplete for book name and author fields
    Autocomplete.init(DOM.bookNameInput, DOM.bookNameAutocomplete, 'title');
    Autocomplete.init(DOM.authorNameInput, DOM.authorNameAutocomplete, 'author');

    console.log('Application initialized successfully');
});
