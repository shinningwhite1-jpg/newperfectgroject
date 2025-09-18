document.addEventListener('DOMContentLoaded', () => {
  const inventory = new InventoryManager();

  document.getElementById('addBtn').addEventListener('click', () => inventory.add());
  document.getElementById('searchInput').addEventListener('input', () => inventory.render());
  window.sortInventory = (by) => inventory.sort(by);

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('href').substring(1);
      const headerTitle = item.dataset.title;

      // Stop the scanner if it's running and we are navigating away
      if (inventory.html5QrcodeScanner && inventory.html5QrcodeScanner.isScanning) {
        inventory.stopScanner();
      }

      document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');

      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      document.getElementById('header-title').textContent = headerTitle;
      
      // Start the scanner only when its page is active
      if (targetId === 'scannerSection') {
        inventory.startScanner();
      }
    });
  });
});

class InventoryManager {
  constructor() {
    this.inventory = JSON.parse(localStorage.getItem('inventory')) || {};
    this.salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    this.sortBy = 'design';
    this.html5QrcodeScanner = null; // To hold the scanner instance
    this.render();
  }

  save() {
    localStorage.setItem('inventory', JSON.stringify(this.inventory));
    localStorage.setItem('salesHistory', JSON.stringify(this.salesHistory));
    this.render();
  }

  add() {
    const d = document.getElementById('designNumber').value.trim();
    const s = document.getElementById('style').value.trim();
    const c = document.getElementById('color').value.trim();
    const size = document.getElementById('size').value.trim();
    const pieces = parseInt(document.getElementById('pieces').value);

    if (!d || !s || !c || !size || isNaN(pieces) || pieces <= 0) {
      return this.showNotification('Enter valid product details.', 'error');
    }

    const sku = this.makeSKU(d, s, c, size);
    this.inventory[sku] = (this.inventory[sku] || 0) + pieces;
    this.save();
    
    this.generateAndShowQR(sku);
    this.showNotification(`Added ${pieces} pieces for ${sku}`, 'success');
  }

  makeSKU(d, s, c, size) {
    return `${d}-${s}-${c}-${size}`.toUpperCase();
  }

  generateAndShowQR(sku) {
    const container = document.getElementById('addRestockQR');
    container.innerHTML = '';

    const qrBox = document.createElement('div');
    qrBox.className = 'qr-container';

    const qrDiv = document.createElement('div');
    new QRCode(qrDiv, {
        text: sku,
        width: 150,
        height: 150,
        colorDark: '#4A148C',
        colorLight: '#f5f5f5',
        correctLevel: QRCode.CorrectLevel.H
    });
    qrBox.appendChild(qrDiv);
    
    const label = document.createElement('div');
    label.textContent = `SKU: ${sku}`;
    label.style.fontWeight = 'bold';
    label.style.marginTop = '5px';
    qrBox.appendChild(label);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download QR';
    downloadBtn.style.marginTop = '10px';
    downloadBtn.onclick = function() {
        const img = qrDiv.querySelector('img');
        if (img) {
            const a = document.createElement('a');
            a.href = img.src;
            a.download = `${sku}.png`;
            a.click();
        } else {
            alert('QR image not found.');
        }
    };
    qrBox.appendChild(downloadBtn);

    container.appendChild(qrBox);
  }

  render() {
    const container = document.getElementById('inventoryList');
    container.innerHTML = '';
    const searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();

    let items = Object.keys(this.inventory).map(sku => {
      const [design, style, color, size] = sku.split('-');
      return { sku, design, style, color, size, stock: this.inventory[sku] };
    });

    if (searchQuery) {
        items = items.filter(item => item.sku.toLowerCase().includes(searchQuery));
    }
    
    items.sort((a, b) => a[this.sortBy].localeCompare(b[this.sortBy]));
    
    let table = `<table class='inventory-table'><tr><th>Design #</th><th>Style</th><th>Color</th><th>Size</th><th>Stock</th></tr>`;
    let total = 0;
    items.forEach(item => {
      table += `<tr>
        <td>${item.design}</td>
        <td>${item.style}</td>
        <td>${item.color}</td>
        <td>${item.size}</td>
        <td class='${item.stock < 5 ? 'low-stock' : ''}'>${item.stock}</td>
      </tr>`;
      total += item.stock;
    });
    table += `</table><div class='total-pieces'>Total Pieces: ${total}</div>`;
    container.innerHTML = table;
  }
  
  sort(by) {
    this.sortBy = by;
    this.render();
  }

  startScanner() {
    if (!window.Html5Qrcode) {
        console.error('Html5Qrcode library not loaded.');
        return;
    }
    
    // Initialize the scanner only if it hasn't been already
    if (!this.html5QrcodeScanner) {
        this.html5QrcodeScanner = new Html5Qrcode('reader');
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Check if scanner is already running before starting
    if (this.html5QrcodeScanner.isScanning) {
      return;
    }

    this.html5QrcodeScanner.start(
      { facingMode: 'environment' }, 
      config, 
      (decodedText) => {
        if (this.inventory[decodedText] !== undefined) {
          if (this.inventory[decodedText] > 0) {
            this.inventory[decodedText]--;
            this.salesHistory.push({ sku: decodedText, date: new Date().toISOString() });
            this.save();
            this.showNotification(`✅ 1 piece deducted: ${decodedText}`, 'success');
          } else {
            this.showNotification(`❌ No stock for ${decodedText}`, 'error');
          }
        } else {
            this.showNotification(`⚠️ Unrecognized SKU: ${decodedText}`, 'error');
        }
      },
      (errorMessage) => {
        // console.log(`QR Code no longer in view.`);
      }
    ).catch(err => {
      console.error("Unable to start QR scanner", err);
      this.showNotification('ERROR: Could not start QR scanner.', 'error');
    });
  }
  
  stopScanner() {
    if (this.html5QrcodeScanner && this.html5QrcodeScanner.isScanning) {
      this.html5QrcodeScanner.stop().then(ignore => {
        console.log("QR Scanner stopped.");
      }).catch(err => {
        console.error("Failed to stop QR scanner.", err);
      });
    }
  }
  
  showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = type;
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }
}