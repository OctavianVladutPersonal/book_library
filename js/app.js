/**
 * Application Initialization
 * Main entry point that initializes the entire application
 */

document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    setupEventListeners();

    // Setup authentication - loads books when user logs in
    setupAuthStateListener((user) => {
        if (user) {
            loadBooks();
        }
        updateView();
    });

    // Initialize autocomplete for book name and author fields
    Autocomplete.init(DOM.bookNameInput, DOM.bookNameAutocomplete, 'title');
    Autocomplete.init(DOM.authorNameInput, DOM.authorNameAutocomplete, 'author');

    console.log('Application initialized successfully');
});
