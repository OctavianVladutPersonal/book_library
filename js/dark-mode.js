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
            this.enableDarkMode(false); // false = don't save to localStorage yet
        }

        this.setupToggleButton();

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.getSavedMode() === null) {
                if (e.matches) {
                    this.enableDarkMode(false);
                } else {
                    this.disableDarkMode(false);
                }
            }
        });
    }

    setupToggleButton() {
        const button = document.getElementById('dark-mode-toggle');
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }
        this.updateToggleButton();
    }

    getSavedMode() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return null;
        }
    }

    isDarkMode() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    toggle() {
        if (this.isDarkMode()) {
            this.disableDarkMode(true);
        } else {
            this.enableDarkMode(true);
        }
    }

    enableDarkMode(save = true) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (save) {
            try {
                localStorage.setItem(this.storageKey, 'true');
            } catch (e) {
                console.warn('localStorage not available:', e);
            }
        }
        this.updateToggleButton();
    }

    disableDarkMode(save = true) {
        document.documentElement.removeAttribute('data-theme');
        if (save) {
            try {
                localStorage.setItem(this.storageKey, 'false');
            } catch (e) {
                console.warn('localStorage not available:', e);
            }
        }
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
function initDarkMode() {
    if (!window.darkModeManager) {
        window.darkModeManager = new DarkModeManager();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
    initDarkMode();
}
