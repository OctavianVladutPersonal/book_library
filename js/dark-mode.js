/**
 * Dark Mode Manager
 * Handles dark mode toggle and persistence
 */

class DarkModeManager {
    constructor() {
        this.storageKey = 'booklib-dark-mode';
        this.preferSystemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.init();
    }

    init() {
        // Load saved preference or use system preference
        const savedMode = this.getSavedMode();
        const isDarkMode = savedMode !== null ? savedMode : this.preferSystemDarkMode;
        
        if (isDarkMode) {
            this.enableDarkMode();
        } else {
            this.updateToggleButton();
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.getSavedMode() === null) {
                if (e.matches) {
                    this.enableDarkMode();
                } else {
                    this.disableDarkMode();
                }
            }
        });

        // Add click event listener to toggle button
        this.setupToggleButton();
    }

    setupToggleButton() {
        const button = document.getElementById('dark-mode-toggle');
        if (button) {
            button.addEventListener('click', () => {
                this.toggle();
            });
            this.updateToggleButton();
        }
    }

    getSavedMode() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : null;
    }

    isDarkMode() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    toggle() {
        if (this.isDarkMode()) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }

    enableDarkMode() {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(this.storageKey, 'true');
        this.updateToggleButton();
    }

    disableDarkMode() {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(this.storageKey, 'false');
        this.updateToggleButton();
    }

    updateToggleButton() {
        const button = document.getElementById('dark-mode-toggle');
        if (button) {
            button.textContent = this.isDarkMode() ? '☀️' : '🌙';
            button.setAttribute('aria-label', this.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        }
    }
}

// Initialize dark mode manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.darkModeManager = new DarkModeManager();
    });
} else {
    window.darkModeManager = new DarkModeManager();
}
