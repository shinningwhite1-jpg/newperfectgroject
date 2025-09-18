// analysis.js - Final Version

document.addEventListener('DOMContentLoaded', () => {
  const inventory = JSON.parse(localStorage.getItem('inventory')) || {};
  const salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];

  if (Object.keys(inventory).length === 0) {
    document.body.innerHTML = '<header><h1>Business Analysis & Growth Reports</h1></header><p>No inventory data to analyze. Please add products first.</p>';
    return;
  }

  const salesCount = salesHistory.reduce((acc, sale) => {
    acc[sale.sku] = (acc[sale.sku] || 0) + 1;
    return acc;
  }, {});

  displayCurrentInventory(inventory);
  createFastSellingChart(salesCount);
  createTurnoverChart(inventory, salesCount);
  createSalesTrendChart(salesHistory);
  createForecastChart(inventory, salesCount);
  displaySkuAnalysis(inventory, salesCount);
});

function displayCurrentInventory(inventory) {
  const container = document.getElementById('currentInventory');
  let invHtml = `<table class='inventory-table'><tr><th>SKU</th><th>Stock</th></tr>`;
  Object.keys(inventory).forEach(sku => {
    invHtml += `<tr><td>${sku}</td><td style='color:${inventory[sku] < 5 ? '#d32f2f' : '#388e3c'}'>${inventory[sku]}</td></tr>`;
  });
  invHtml += '</table>';
  container.innerHTML = invHtml;
}

function createFastSellingChart(salesCount) {
  const sortedSales = Object.entries(salesCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (sortedSales.length > 0) {
    new Chart(document.getElementById('fastSellingChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: sortedSales.map(e => e[0]),
        datasets: [{
          label: 'Units Sold',
          data: sortedSales.map(e => e[1]),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }
}

function createTurnoverChart(inventory, salesCount) {
  const data = Object.keys(inventory).map(sku => ({ sku, stock: inventory[sku], sold: salesCount[sku] || 0 }));
  new Chart(document.getElementById('turnoverChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: data.map(e => e.sku),
      datasets: [
        { label: 'Stock', data: data.map(e => e.stock), borderColor: 'rgba(54, 162, 235, 1)', tension: 0.3 },
        { label: 'Sold', data: data.map(e => e.sold), borderColor: 'rgba(255, 206, 86, 1)', tension: 0.3 }
      ]
    },
    options: { responsive: true }
  });
}

function createSalesTrendChart(salesHistory) {
    const salesByDay = salesHistory.reduce((acc, sale) => {
        const date = new Date(sale.date).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});
    
    const sortedDates = Object.keys(salesByDay).sort((a,b) => new Date(a) - new Date(b));

    if(sortedDates.length > 0) {
        new Chart(document.getElementById('salesTrendChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Sales per Day',
                    data: sortedDates.map(date => salesByDay[date]),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
}


function createForecastChart(inventory, salesCount) {
  const data = Object.keys(inventory).map(sku => ({ sku, sold: salesCount[sku] || 0 }));
  new Chart(document.getElementById('forecastChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: data.map(e => e.sku),
      datasets: [{
        label: 'Forecasted Demand',
        data: data.map(e => Math.ceil(e.sold * 1.2)),
        backgroundColor: 'rgba(153, 102, 255, 0.7)',
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function displaySkuAnalysis(inventory, salesCount) {
  const container = document.getElementById('skuAnalysis');
  let skuHtml = `<table class='inventory-table'><tr><th>SKU</th><th>Units Sold</th><th>Current Stock</th><th>Low Stock</th></tr>`;
  Object.keys(inventory).forEach(sku => {
    const stock = inventory[sku];
    const sold = salesCount[sku] || 0;
    skuHtml += `<tr><td>${sku}</td><td>${sold}</td><td>${stock}</td><td style='color:${stock < 5 ? '#d32f2f' : '#388e3c'}'>${stock < 5 ? 'Yes' : 'No'}</td></tr>`;
  });
  skuHtml += '</table>';
  container.innerHTML = skuHtml;
}