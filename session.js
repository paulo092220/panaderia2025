class SessionManager {
  constructor() {
    this.credentials = {
      username: 'panaderia2025',
      password: '850301'
    };
    this.dbName = 'bakeryDB';
    this.dbVersion = 1;
    this.db = null;
    this.init();
  }

  async init() {
    await this.initDB();
    this.checkSession();
    this.setupEventListeners();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error("Database error:", event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'timestamp' });
        }
      };
    });
  }

  async saveToDB(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLatestBackup() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          resolve(cursor.value);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllBackups() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cleanupOldBackups() {
    const allBackups = await this.getAllBackups();
    if (allBackups.length > 5) {
      const sortedBackups = allBackups.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      const backupsToDelete = sortedBackups.slice(5);
      
      const transaction = this.db.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');

      for (const backup of backupsToDelete) {
        store.delete(backup.timestamp);
      }
    }
  }

  async saveAllData() {
    const timestamp = new Date().toISOString();
    const data = {
      timestamp: timestamp,
      inventory: localStorage.getItem('bakeryInventory'),
      products: localStorage.getItem('bakeryProducts'),
      deletedProducts: localStorage.getItem('bakeryDeletedProducts'),
      inventoryHistory: localStorage.getItem('bakeryInventoryHistory'),
      productions: localStorage.getItem('bakeryProductions'),
      recipeSettings: localStorage.getItem('recipeSettings'),
      calculatorState: localStorage.getItem('investmentCalculatorState')
    };

    try {
      await this.saveToDB(data);
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async loadAllData() {
    try {
      const latestBackup = await this.getLatestBackup();
      if (latestBackup) {
        localStorage.setItem('bakeryInventory', latestBackup.inventory || '{}');
        localStorage.setItem('bakeryProducts', latestBackup.products || '[]');
        localStorage.setItem('bakeryDeletedProducts', latestBackup.deletedProducts || '[]');
        localStorage.setItem('bakeryInventoryHistory', latestBackup.inventoryHistory || '[]');
        localStorage.setItem('bakeryProductions', latestBackup.productions || '[]');
        localStorage.setItem('recipeSettings', latestBackup.recipeSettings || '{}');
        localStorage.setItem('investmentCalculatorState', latestBackup.calculatorState || '{}');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.handleLogout();
      });
    }
  }

  checkSession() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      this.loadAllData();
      this.showSystemContent();
    } else {
      this.showLoginForm();
    }
  }

  handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    if (username === this.credentials.username && password === this.credentials.password) {
      sessionStorage.setItem('isLoggedIn', 'true');
      this.loadAllData();
      this.showSystemContent();
      errorMessage.style.display = 'none';
    } else {
      errorMessage.style.display = 'block';
    }
  }

  handleLogout() {
    this.saveAllData();
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
  }

  showSystemContent() {
    const loginSection = document.getElementById('loginSection');
    const systemContent = document.getElementById('systemContent');
    if (loginSection) loginSection.style.display = 'none';
    if (systemContent) systemContent.style.display = 'block';
  }

  showLoginForm() {
    const loginSection = document.getElementById('loginSection');
    const systemContent = document.getElementById('systemContent');
    if (loginSection) loginSection.style.display = 'block';
    if (systemContent) systemContent.style.display = 'none';
  }

}

// Initialize session management
const sessionManager = new SessionManager();

// Add protection to other pages
if (document.location.pathname.includes('warehouse.html') || 
    document.location.pathname.includes('production.html')) {
  if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
  }
}

// Save data periodically
setInterval(async () => {
  if (sessionStorage.getItem('isLoggedIn') === 'true') {
    await sessionManager.saveAllData();
  }
}, 300000); // Save every 5 minutes

// Save data before closing the page
window.addEventListener('beforeunload', async (e) => {
  if (sessionStorage.getItem('isLoggedIn') === 'true') {
    e.preventDefault();
    await sessionManager.saveAllData();
  }
});