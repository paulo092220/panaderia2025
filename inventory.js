// Definición de productos básicos
const basicProducts = [
  'Harina',
  'Azúcar',
  'Levadura',
  'Núcleo',
  'Aceite',
  'Sal'
];

// Clase para manejar el inventario
class InventoryManager {
  constructor() {
    this.inventory = this.loadInventory();
    this.products = this.loadProducts();
    this.deletedProducts = this.loadDeletedProducts(); // Load deleted products
    this.initializeProducts();
    this.setupEventListeners();
    this.updateInventoryTable();
    this.updateDeletedProductsDisplay(); // Initialize display of deleted products
  }

  loadInventory() {
    const savedInventory = localStorage.getItem('bakeryInventory');
    return savedInventory ? JSON.parse(savedInventory) : {};
  }

  loadProducts() {
    let savedProducts = localStorage.getItem('bakeryProducts');
    let parsedProducts = savedProducts ? JSON.parse(savedProducts) : [];

    // Remove "Azúcar Parda" if it exists
    parsedProducts = parsedProducts.filter(product => product !== "Azúcar Parda");

    // Ensure basicProducts are always included and duplicates are avoided
    const allProducts = [...new Set([...parsedProducts, ...basicProducts])];
    return allProducts;
  }

  saveInventory() {
    localStorage.setItem('bakeryInventory', JSON.stringify(this.inventory));
  }

  saveProducts() {
    localStorage.setItem('bakeryProducts', JSON.stringify(this.products));
  }

  loadInventoryHistory() {
    const savedHistory = localStorage.getItem('bakeryInventoryHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  }

  saveInventoryHistory(history) {
    localStorage.setItem('bakeryInventoryHistory', JSON.stringify(history));
  }

  clearHistory() {
    localStorage.removeItem('bakeryInventoryHistory');
    this.displayInventoryHistory(); // Refresh the display
  }

  // New methods to handle deleted products
  loadDeletedProducts() {
    const savedDeletedProducts = localStorage.getItem('bakeryDeletedProducts');
    return savedDeletedProducts ? JSON.parse(savedDeletedProducts) : [];
  }

  saveDeletedProducts() {
    localStorage.setItem('bakeryDeletedProducts', JSON.stringify(this.deletedProducts));
  }

  restoreProduct(product) {
    if (this.deletedProducts.includes(product)) {
      this.deletedProducts = this.deletedProducts.filter(p => p !== product);
      this.products.push(product);

      this.saveDeletedProducts();
      this.saveProducts();

      this.updateProductsTable();
      this.updateProductSelect();
      this.updateInventoryTable();
      this.updateDeletedProductsDisplay();

      document.dispatchEvent(new Event('inventoryUpdated'));
    }
  }

  updateDeletedProductsDisplay() {
    const deletedProductsList = document.getElementById('deletedProductsList');
    if (!deletedProductsList) return;

    deletedProductsList.innerHTML = '';

    this.deletedProducts.forEach(product => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <span>${product}</span>
        <button class="restore-button" onclick="inventoryManager.restoreProduct('${product}')">Restaurar</button>
      `;
      deletedProductsList.appendChild(listItem);
    });
  }

  initializeProducts() {
    this.updateProductSelect();
    this.updateProductsTable();
  }

  updateProductSelect() {
    const productSelect = document.getElementById('productSelect');
    if (!productSelect) return;
    productSelect.innerHTML = '<option value="">Seleccionar Producto</option>';
    this.products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.toLowerCase();
      option.textContent = product;
      productSelect.appendChild(option);
    });

    productSelect.addEventListener('change', (e) => {
      this.updateUnitSelectOptions(e.target.value);
    });
  }

  updateUnitSelectOptions(product) {
    const unitSelect = document.getElementById('unitSelect');
    if (!unitSelect) return;
    unitSelect.innerHTML = '<option value="">Seleccionar Unidad</option>';

    const allUnits = `
      <option value="sacos">Sacos</option>
      <option value="paquetes">Paquetes</option>
      <option value="kg">Kilogramos (Kg)</option>
      <option value="g">Gramos (g)</option>
      <option value="lb">Libras (Lb)</option>
      <option value="l">Litros (L)</option>
      <option value="oz">Onzas (Oz)</option>
    `;

    unitSelect.innerHTML += allUnits;
  }

  setupEventListeners() {
    const form = document.getElementById('inventoryForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleInventorySubmit();
      });
    }

    const newProductForm = document.getElementById('newProductForm');
    if (newProductForm) {
      newProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleNewProduct();
      });
    }
  }

  handleNewProduct() {
    const productName = document.getElementById('newProductName').value.trim();
    if (!productName) return;

    if (this.products.includes(productName)) {
      alert('Este producto ya existe');
      return;
    }

    this.products.push(productName);
    this.saveProducts();
    this.updateProductSelect();
    this.updateProductsTable();
    document.getElementById('newProductName').value = '';

    document.dispatchEvent(new Event('inventoryUpdated'));
  }

  updateProductsTable() {
    const tableBody = document.getElementById('productsBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    this.products.forEach(product => {
      const row = document.createElement('tr');
      const isBasicProduct = basicProducts.includes(product);
      const deleteButton = isBasicProduct ? '' : `
        <button class="btn btn-danger btn-sm" onclick="inventoryManager.deleteProductType('${product}')">
          Eliminar
        </button>
      `;

      row.innerHTML = `
        <td>${product}</td>
        <td>
          ${deleteButton}
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  deleteProductType(product) {
    if (basicProducts.includes(product)) {
      alert('No se pueden eliminar los productos básicos.');
      return;
    }

    if (confirm(`¿Está seguro que desea eliminar ${product} de la lista de productos?`)) {
      this.products = this.products.filter(p => p !== product);
      this.deletedProducts.push(product); // Add to deleted products list

      if (this.inventory[product.toLowerCase()]) {
        delete this.inventory[product.toLowerCase()];
      }

      let inventoryHistory = this.loadInventoryHistory();
      inventoryHistory = inventoryHistory.filter(record => record.product !== product.toLowerCase());
      this.saveInventoryHistory(inventoryHistory);

      this.saveProducts();
      this.saveInventory();
      this.saveDeletedProducts(); // Save deleted products

      this.updateProductsTable();
      this.updateProductSelect();
      this.updateInventoryTable();
      this.updateDeletedProductsDisplay();

      document.dispatchEvent(new Event('inventoryUpdated'));
    }
  }

  handleInventorySubmit() {
    const product = document.getElementById('productSelect').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const unit = document.getElementById('unitSelect').value;
    const unitPrice = parseFloat(document.getElementById('unitPrice').value);

    if (product && quantity && unit && unitPrice) {
      this.updateInventory(product, quantity, unit, unitPrice);
      this.updateInventoryTable();
      document.getElementById('inventoryForm').reset();
    }
  }

  updateInventory(product, quantity, unit, unitPrice) {
    const productKey = product.toLowerCase();
    const now = new Date();
    const historyEntry = {
      date: now.toISOString(),
      quantity: quantity,
      unit: unit,
      unitPrice: unitPrice,
      type: 'entrada',
      product: productKey,
      totalPrice: quantity * unitPrice
    };

    let inventoryHistory = this.loadInventoryHistory();

    if (!this.inventory[productKey]) {
      this.inventory[productKey] = {
        quantity: 0,
        totalPrice: 0,
        unit: unit,
        unitPrices: [],
      };
    }

    let convertedQuantity = quantity;
    if (this.inventory[productKey].unit !== unit) {
      const newQuantityConversion = this.convertToKgAndLb(quantity, unit);
      const inventoryUnitConversion = this.convertToKgAndLb(1, this.inventory[productKey].unit);
      
      if (newQuantityConversion && inventoryUnitConversion) {
        convertedQuantity = newQuantityConversion.kg / inventoryUnitConversion.kg;
      }
    }

    this.inventory[productKey].quantity += convertedQuantity;
    this.inventory[productKey].totalPrice += quantity * unitPrice;
    this.inventory[productKey].unitPrices.push(unitPrice);

    const totalUnitPrices = this.inventory[productKey].unitPrices.reduce((sum, price) => sum + price, 0);
    const numberOfPrices = this.inventory[productKey].unitPrices.length;
    this.inventory[productKey].unitPrice = totalUnitPrices / numberOfPrices;

    this.saveInventory();
    
    inventoryHistory.push(historyEntry);
    this.saveInventoryHistory(inventoryHistory);

    document.dispatchEvent(new Event('inventoryUpdated'));
  }

  formatQuantityAndUnit(quantity, unit, product) {
    const conversion = this.convertToKgAndLb(quantity, unit);
    if (!conversion) {
      return `${quantity.toFixed(2)} ${unit}`;
    }

    let displayText = '';

    if (unit.toLowerCase() === 'sacos') {
      const wholeSacks = Math.floor(quantity);
      const partialSack = quantity - wholeSacks;

      if (wholeSacks > 0) {
        displayText += `${wholeSacks} saco(s)`;
        if (partialSack > 0) {
          const remainingKg = partialSack * 50;
          displayText += ` y ${remainingKg.toFixed(2)} kg`;
        }
      } else {
        displayText = `${quantity.toFixed(2)} saco(s)`;
      }
    } else if (unit.toLowerCase() === 'paquetes') {
      const wholePacks = Math.floor(quantity);
      const partialPack = quantity - wholePacks;

      if (wholePacks > 0) {
        displayText += `${wholePacks} paquete(s)`;
        if (partialPack > 0) {
          const remainingG = partialPack * 500;
          displayText += ` y ${remainingG.toFixed(2)} g`;
        }
      } else {
        displayText = `${quantity.toFixed(2)} paquete(s)`;
      }
    } else if (unit.toLowerCase() === 'g') {
      displayText = `${quantity.toFixed(2)} g`;
    } else {
      displayText = `${quantity.toFixed(2)} ${unit}`;
    }

    displayText += `<br>(Total: ${conversion.kg.toFixed(2)} kg / ${conversion.lb.toFixed(2)} lb)`;

    return displayText;
  }

  updateInventoryTable() {
    const tableBody = document.getElementById('inventoryBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const groupedInventory = {};
    Object.entries(this.inventory).forEach(([product, data]) => {
      if (!groupedInventory[product]) {
        groupedInventory[product] = {
          totalQuantity: 0,
          totalPrice: 0,
          unitPrice: data.unitPrice,
          unitPrices: data.unitPrices,
          entries: []
        };
      }
      groupedInventory[product].totalQuantity += data.quantity;
      groupedInventory[product].totalPrice += data.totalPrice;
      groupedInventory[product].entries.push(data);
    });

    Object.entries(groupedInventory).forEach(([product, groupedData]) => {
      const totalQuantity = groupedData.totalQuantity;
      const totalPrice = groupedData.totalPrice;
      const averageUnitPrice = totalPrice / totalQuantity;
      const unitPrice = groupedData.unitPrice;

      const row = document.createElement('tr');
      row.className = 'inventory-row';

      const conversion = this.convertToKgAndLb(totalQuantity, groupedData.entries[0].unit, product);
      let pricePerKg = 'N/A';
      let pricePerLb = 'N/A';
      let pricePerGram = 'N/A';

      if (conversion) {
        pricePerKg = `$${(totalPrice / conversion.kg).toFixed(2)}`;
        pricePerLb = `$${(totalPrice / conversion.lb).toFixed(2)}`;
        pricePerGram = `$${(totalPrice / (conversion.kg * 1000)).toFixed(4)}`;
      }

      row.innerHTML = `
        <td>${product.charAt(0).toUpperCase() + product.slice(1)}</td>
        <td>${this.formatQuantityAndUnit(totalQuantity, groupedData.entries[0].unit, product)}</td>
        <td>${groupedData.entries[0].unit}</td>
        <td>$${unitPrice.toFixed(2)}</td>
        <td>$${totalPrice.toFixed(2)}</td>
        <td>${pricePerKg} / ${pricePerLb} / ${pricePerGram}</td>
        <td>
          <button class="btn btn-danger btn-sm action-button" onclick="inventoryManager.deleteItem('${product}')">
            Eliminar
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    const totalInvestment = this.calculateTotalInvestment();
    document.getElementById('totalInvestment').textContent = totalInvestment.toFixed(2);
  }

  convertToKgAndLb(qty, fromUnit) {
    let kg, lb;

    switch (fromUnit.toLowerCase()) {
      case 'sacos':
        kg = qty * 50;
        lb = kg * 2.20462;
        break;
      case 'paquetes':
        kg = qty * 0.5;
        lb = kg * 2.20462;
        break;
      case 'kg':
        kg = qty;
        lb = qty * 2.20462;
        break;
      case 'g':
        kg = qty / 1000;
        lb = kg * 2.20462;
        break;
      case 'lb':
        kg = qty / 2.20462;
        lb = qty;
        break;
      case 'l':
        kg = qty;
        lb = qty * 2.20462;
        break;
      case 'oz':
        kg = qty * 0.0283495;
        lb = qty * 0.0625;
        break;
      default:
        return null;
    }

    return {
      kg,
      lb
    };
  }

  calculateTotalInvestment() {
    return Object.values(this.inventory).reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  }

  deleteItem(product) {
    if (confirm(`¿Está seguro que desea eliminar ${product} del inventario?`)) {
      delete this.inventory[product];
      this.saveInventory();
      this.updateInventoryTable();

      document.dispatchEvent(new Event('inventoryUpdated'));
    }
  }

  displayInventoryHistory() {
    const history = this.loadInventoryHistory();
    const historyBody = document.getElementById('inventoryHistoryBody');
    if (!historyBody) return;

    historyBody.innerHTML = '';

    history.forEach(record => {
      const row = document.createElement('tr');
      const date = new Date(record.date).toLocaleDateString();
      const time = new Date(record.date).toLocaleTimeString();
      const quantity = record.quantity.toFixed(2);
      const unit = record.unit;
      const unitPrice = record.unitPrice ? record.unitPrice.toFixed(2) : '0.00';
      const type = record.type;
      const product = record.product.charAt(0).toUpperCase() + record.product.slice(1);
      const total = record.totalPrice ? record.totalPrice.toFixed(2) : '0.00';

      row.innerHTML = `
        <td>${date} ${time}</td>
        <td>${product}</td>
        <td class="${type === 'entrada' ? 'text-success' : 'text-danger'}">${type}</td>
        <td>${quantity} ${unit}</td>
        <td>$${unitPrice}</td>
        <td>$${total}</td>
      `;
      historyBody.appendChild(row);
    });
  }

  setupInvestmentCalculator() {
    const productInputs = document.getElementById('productInputs');
    const investmentCalculatorForm = document.getElementById('investmentCalculatorForm');
    if (!productInputs || !investmentCalculatorForm) return;

    productInputs.innerHTML = ''; // Clear existing inputs

    this.products.forEach(product => {
      const productDiv = document.createElement('div');
      productDiv.className = 'col-md-6';
      productDiv.innerHTML = `
        <label for="${product}Price" class="form-label">Precio por Unidad de ${product}:</label>
        <div class="input-group">
          <input type="number" class="form-control product-price" id="${product}Price" placeholder="Precio" required data-product="${product}">
          <select class="form-select product-unit" id="${product}Unit" data-product="${product}">
            <option value="kg">Kilogramos (kg)</option>
            <option value="g">Gramos (g)</option>
            <option value="lb">Libras (lb)</option>
            <option value="l">Litros (L)</option>
            <option value="oz">Onzas (Oz)</option>
            <option value="sacos">Sacos</option>
            <option value="paquetes">Paquetes</option>
          </select>
        </div>
      `;
      productInputs.appendChild(productDiv);
    });

    investmentCalculatorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.calculateOptimalInvestment();
    });
  }

  calculateOptimalInvestment() {
    const availableCapital = parseFloat(document.getElementById('availableCapital').value);
    if (isNaN(availableCapital) || availableCapital <= 0) {
      alert('Por favor, ingrese un capital válido.');
      return;
    }

    const productPrices = {};
    const priceInputs = document.querySelectorAll('.product-price');
    const unitSelects = document.querySelectorAll('.product-unit');

    priceInputs.forEach(input => {
      const product = input.dataset.product;
      const price = parseFloat(input.value);
      if (isNaN(price) || price <= 0) {
        alert(`Por favor, ingrese un precio válido para ${product}.`);
        return;
      }
      productPrices[product] = price;
    });

    const productUnits = {};
    unitSelects.forEach(select => {
      const product = select.dataset.product;
      const unit = select.value;
      productUnits[product] = unit;
    });

    const settings = this.loadRecipeSettings();

    let costOfOneMass = 0;
    const resourcesInvested = {};
    settings.ingredients.forEach(ingredient => {
      const product = ingredient.name;
      const pricePerUnit = productPrices[product];
      const unit = productUnits[product];

      if (pricePerUnit && unit) {
        let ingredientAmountInSelectedUnit;

        if (ingredient.unit !== unit) {
          const recipeIngredientConversion = this.convertToKgAndLb(ingredient.amount, ingredient.unit);
          const investmentIngredientConversion = this.convertToKgAndLb(1, unit);
          
          if (recipeIngredientConversion && investmentIngredientConversion) {
            ingredientAmountInSelectedUnit = recipeIngredientConversion.kg / investmentIngredientConversion.kg;
          } else {
            ingredientAmountInSelectedUnit = ingredient.amount; 
          }
        } else {
          ingredientAmountInSelectedUnit = ingredient.amount;
        }

        const cost = ingredientAmountInSelectedUnit * pricePerUnit;
        costOfOneMass += cost;

        resourcesInvested[product] = {
          amount: ingredientAmountInSelectedUnit,
          unit: unit,
          cost: cost,
          pricePerUnit: pricePerUnit
        };
      }
    });

    const numberOfMasses = availableCapital / costOfOneMass;

    const remainingResources = {};
    const purchaseDetails = {};
    let totalInvestmentCost = 0;

    for (const product in resourcesInvested) {
      const invested = resourcesInvested[product];
      const totalAmountNeeded = numberOfMasses * invested.amount;
      const totalCost = totalAmountNeeded * invested.pricePerUnit;
      totalInvestmentCost += totalCost;

      remainingResources[product] = {
        quantity: totalAmountNeeded,
        unit: invested.unit,
        pricePerUnit: invested.pricePerUnit,
        cost: totalCost
      };

      purchaseDetails[product] = {
        quantity: totalAmountNeeded,
        unit: invested.unit,
        pricePerUnit: invested.pricePerUnit,
        totalCost: totalCost
      };
    }

    const moneyLeft = availableCapital - totalInvestmentCost;

    const breadsPerMass = settings.breadsPerMass;
    const pricePerBread = settings.pricePerBread;
    const totalBreads = numberOfMasses * breadsPerMass;
    const totalRevenue = totalBreads * pricePerBread;
    const totalProfit = totalRevenue - totalInvestmentCost;

    const investmentResults = document.getElementById('investmentResults');
    investmentResults.innerHTML = `
      <h4>Resultados de la Inversión Óptima:</h4>
      <p>Número de Masas a Producir: ${numberOfMasses.toFixed(2)}</p>
      <p>Número Total de Panes: ${totalBreads.toFixed(0)}</p>
      <p>Inversión Total: $${totalInvestmentCost.toFixed(2)}</p>
      <p>Ingreso Total Estimado: $${totalRevenue.toFixed(2)}</p>
      <p>Ganancia Neta Estimada: $${totalProfit.toFixed(2)}</p>
    `;

    const remainingResourcesDiv = document.getElementById('remainingResources');
    remainingResourcesDiv.innerHTML = `
      <h4>Recursos Necesarios:</h4>
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio/Unidad</th>
              <th>Costo</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(remainingResources).map(([product, data]) => `
              <tr>
                <td>${product}</td>
                <td>${data.quantity.toFixed(2)}</td>
                <td>${data.unit}</td>
                <td>$${data.pricePerUnit.toFixed(2)}</td>
                <td>$${data.cost.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const purchaseDetailsDiv = document.getElementById('purchaseDetails');
    purchaseDetailsDiv.innerHTML = `
      <h4>Detalles de la Compra:</h4>
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio/Unidad</th>
              <th>Costo Total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(purchaseDetails).map(([product, data]) => `
              <tr>
                <td>${product}</td>
                <td>${data.quantity.toFixed(2)}</td>
                <td>${data.unit}</td>
                <td>$${data.pricePerUnit.toFixed(2)}</td>
                <td>$${data.totalCost.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const moneyLeftDiv = document.getElementById('moneyLeft');
    moneyLeftDiv.innerHTML = `
      <h4>Presupuesto No Utilizado:</h4>
      <p>$${moneyLeft.toFixed(2)}</p>
    `;
  }

  loadRecipeSettings() {
    return JSON.parse(localStorage.getItem('recipeSettings')) || {
      breadsPerMass: 264,
      pricePerBread: 17,
      ingredients: []
    };
  }
}

const inventoryManager = new InventoryManager();