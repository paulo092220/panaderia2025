class ProductionManager {
  constructor(inventoryManager) {
    this.inventoryManager = inventoryManager;
    this.productions = this.loadProductions();
    this.updateProductionTable();
  }

  loadProductions() {
    const savedProductions = localStorage.getItem('bakeryProductions');
    return savedProductions ? JSON.parse(savedProductions) : [];
  }

  saveProductions() {
    localStorage.setItem('bakeryProductions', JSON.stringify(this.productions));
  }

  updateProductionTable() {
    const tableBody = document.getElementById('productionBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    let totalInvestment = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    this.productions.forEach((production, index) => {
      const row = document.createElement('tr');
      row.className = 'production-row';

      let resourcesList = '';
      let productionInvestment = 0;
      let possibleMasses = 0;
      let possibleBreads = 0;
      let remainingResourcesInfo = {}; 
      let remainingResourcesList = '';

      Object.entries(production.resources).forEach(([resource, data]) => {
        const formattedResource = resource.charAt(0).toUpperCase() + resource.slice(1);
        const inventoryItem = this.inventoryManager.inventory[resource];

        let resourcePrice = 'N/A';
        if (inventoryItem) {
          const conversion = this.inventoryManager.convertToKgAndLb(data.amount, data.unit);
          if (conversion) {
            const pricePerKg = inventoryItem.unitPrice / (this.inventoryManager.convertToKgAndLb(inventoryItem.quantity, inventoryItem.unit).kg / inventoryItem.quantity);
            resourcePrice = (pricePerKg * conversion.kg).toFixed(2);
            productionInvestment += parseFloat(resourcePrice);
          }
        }

        resourcesList += `
          <div>
            <strong>${formattedResource}:</strong> ${data.amount.toFixed(2)} ${data.unit} ($${resourcePrice})
          </div>`;
      });

      const settings = this.loadFormulaSettings();
      possibleMasses = this.calculatePossibleMasses(production.resources, settings, remainingResourcesInfo);
      possibleBreads = possibleMasses * settings.breadsPerMass;
      const estimatedRevenue = possibleBreads * settings.pricePerBread;
      const estimatedProfit = estimatedRevenue - productionInvestment;

      remainingResourcesList = Object.entries(remainingResourcesInfo)
        .map(([resource, { amount, unit }]) => 
          `<small>${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${this.inventoryManager.formatQuantityAndUnit(amount, unit, resource)}</small>`
        )
        .join(' | ');
      
      row.innerHTML = `
        <td>${new Date(production.date).toLocaleDateString()}</td>
        <td>${resourcesList}</td>
        <td>${possibleMasses.toFixed(2)}</td>
        <td>${possibleBreads.toFixed(0)}</td>
        <td>$${productionInvestment.toFixed(2)}</td> 
        <td>$${estimatedRevenue.toFixed(2)}</td>
        <td>$${estimatedProfit.toFixed(2)}</td>
        <td>
          <button class="btn btn-danger btn-sm action-button" onclick="productionManager.deleteProduction(${index})">
            Eliminar
          </button>
        </td>
      `;

      tableBody.appendChild(row);
      totalInvestment += productionInvestment;
      totalRevenue += estimatedRevenue;
      totalProfit += estimatedProfit;

      if (remainingResourcesList) {
        const remainingRow = document.createElement('tr');
        remainingRow.innerHTML = `<td colspan="8" class="text-muted small"><em>Recursos Sobrantes:</em> ${remainingResourcesList}</td>`;
        remainingRow.style.backgroundColor = '#f8f9fa';
        tableBody.appendChild(remainingRow);
      }
    });

    const footerRow = document.createElement('tr');
    footerRow.innerHTML = `
      <td colspan="4" class="text-end"><strong>Totales:</strong></td>
      <td><strong>$${totalInvestment.toFixed(2)}</strong></td>
      <td><strong>$${totalRevenue.toFixed(2)}</strong></td>
      <td><strong>$${totalProfit.toFixed(2)}</strong></td>
      <td></td>
    `;
    tableBody.appendChild(footerRow);
  }

  calculatePossibleMasses(resources, settings, remainingResourcesInfo) {
    let possibleMasses = Infinity;
    for (const ingredient in resources) {
      const resource = resources[ingredient];
      const conversion = this.inventoryManager.convertToKgAndLb(resource.amount, resource.unit);
      if (!conversion) continue;
  
      const recipeIngredient = settings.ingredients.find(item => item.name.toLowerCase() === ingredient.toLowerCase());
      if (!recipeIngredient) continue;
      
      const recipeConversion = this.inventoryManager.convertToKgAndLb(recipeIngredient.amount, recipeIngredient.unit);
  
      if (recipeConversion && recipeConversion.kg > 0) {
        const massesPossibleWithIngredient = conversion.kg / recipeConversion.kg;
        possibleMasses = Math.min(possibleMasses, massesPossibleWithIngredient);
        
        const amountNeededForMaxMasses = possibleMasses * recipeConversion.kg;
        const remainingAmount = conversion.kg - amountNeededForMaxMasses;

        remainingResourcesInfo[ingredient] = {
          amount: remainingAmount,
          unit: 'kg'
        };
      }
    }
    return possibleMasses === Infinity ? 0 : possibleMasses;
  }

  deleteProduction(index) {
    if (confirm('¿Está seguro que desea eliminar este registro de despacho?')) {
      this.productions.splice(index, 1);
      this.saveProductions();
      this.updateProductionTable();
    }
  }

  loadFormulaSettings() {
    return JSON.parse(localStorage.getItem('recipeSettings')) || {
      breadsPerMass: 264,
      pricePerBread: 17,
      ingredients: []
    };
  }

  registerDispatch() {
    const resources = {};
    let allValid = true;
    let canDeduct = true;

    Array.from(document.querySelectorAll('#resourcesList .row')).forEach(row => {
      const name = row.querySelector('.resource-name').value.toLowerCase();
      const amount = parseFloat(row.querySelector('.resource-amount').value);
      const unit = row.querySelector('.resource-unit').value;

      if (isNaN(amount) || amount <= 0) {
        alert('Por favor, introduce cantidades válidas para todos los recursos.');
        allValid = false;
        return;
      }

      const inventoryItem = this.inventoryManager.inventory[name];
      if (!inventoryItem) {
        alert(`No hay existencias de ${name} en el inventario.`);
        canDeduct = false;
        return;
      }

      const dispatchConversion = this.inventoryManager.convertToKgAndLb(amount, unit);
      const inventoryConversion = this.inventoryManager.convertToKgAndLb(
        inventoryItem.quantity,
        inventoryItem.unit
      );

      if (!dispatchConversion || !inventoryConversion) {
        alert(`No se puede convertir las unidades para ${name}.`);
        canDeduct = false;
        return;
      }

      if (dispatchConversion.kg > inventoryConversion.kg) {
        alert(`No hay suficiente ${name} en el inventario. Disponible: ${inventoryItem.quantity} ${inventoryItem.unit}`);
        canDeduct = false;
        return;
      }

      resources[name] = {
        amount: amount,
        unit: unit
      };
    });

    if (!allValid || !canDeduct) return;

    Object.entries(resources).forEach(([name, data]) => {
      const inventoryItem = this.inventoryManager.inventory[name];
      const dispatchConversion = this.inventoryManager.convertToKgAndLb(data.amount, data.unit);
      const inventoryConversion = this.inventoryManager.convertToKgAndLb(
        inventoryItem.quantity,
        inventoryItem.unit
      );

      const remainingKg = inventoryConversion.kg - dispatchConversion.kg;
      const remainingInInventoryUnit = remainingKg * (inventoryItem.quantity / inventoryConversion.kg);

      inventoryItem.quantity = remainingInInventoryUnit;
      if (inventoryItem.quantity <= 0) {
        delete this.inventoryManager.inventory[name];
      }

      const historyEntry = {
        date: new Date().toISOString(),
        quantity: data.amount,
        unit: data.unit,
        type: 'salida',
        product: name,
        unitPrice: inventoryItem.unitPrice,
        totalPrice: data.amount * inventoryItem.unitPrice
      };

      let inventoryHistory = this.inventoryManager.loadInventoryHistory();
      inventoryHistory.push(historyEntry);
      this.inventoryManager.saveInventoryHistory(inventoryHistory);
    });

    this.inventoryManager.saveInventory();
    document.dispatchEvent(new Event('inventoryUpdated'));

    const dispatchData = {
      date: new Date().toISOString(),
      resources: resources
    };

    this.productions.push(dispatchData);
    this.saveProductions();
    this.updateProductionTable();
  }
}

document.addEventListener('inventoryUpdated', () => {
  if (productionManager) {
  }
});

document.addEventListener('formulaSettingsUpdated', () => {
  if (productionManager) {
  }
});

const productionManager = new ProductionManager(inventoryManager);