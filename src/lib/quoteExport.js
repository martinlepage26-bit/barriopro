export function exportQuoteToCSV({ project, quote, estimate, materials, segments, company }) {
  const rows = [];
  const add = (line) => rows.push(line);
  const addEmpty = () => rows.push('');

  const totalLF = segments.reduce((s, seg) => s + (seg.length_feet || 0), 0);
  const totalGates = segments.reduce((s, seg) => s + (seg.gate_count || 0), 0);

  const materialCost = materials.reduce((s, m) => s + (m.quantity || 0) * (m.cost || 0), 0);
  const laborCost = estimate ? (estimate.labor_hours || 0) * (estimate.labor_rate || 0) : 0;
  const directCost = materialCost + laborCost + (estimate?.equipment_cost || 0) + (estimate?.subcontractor_cost || 0) + (estimate?.other_cost || 0);
  const overheadAmount = directCost * ((estimate?.overhead_percentage || 0) / 100);
  const markupAmount = (directCost + overheadAmount) * ((estimate?.markup_percentage || 0) / 100);
  const sellingPrice = directCost + overheadAmount + markupAmount;
  const taxAmount = sellingPrice * ((estimate?.sales_tax_percentage || 0) / 100);
  const customerTotal = sellingPrice + taxAmount;

  // En-tête
  add((company?.name || 'BarrioPro') + ' - Devis');
  add(`Devis #,${esc(quote.quote_number)}`);
  add(`Date,${new Date().toLocaleDateString('fr-CA')}`);
  add(`Expiration,${quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString('fr-CA') : ''}`);
  add(`Statut,${esc(quote.status || '')}`);
  addEmpty();

  // Client
  add('CLIENT');
  add(`Nom,${esc(project.customer)}`);
  add(`Adresse,${esc(project.address)}`);
  addEmpty();

  // Projet
  add('PROJET');
  add(`Nom,${esc(project.name)}`);
  add(`Adresse,${esc(project.address)}`);
  add(`Numéro,${esc(project.project_number || '')}`);
  add(`Estimateur,${esc(project.estimator || '')}`);
  addEmpty();

  // Portée des travaux
  add('PORTÉE DES TRAVAUX');
  add(esc(quote.scope_of_work || ''));
  add(`Total linéaire (pi),${totalLF.toFixed(1)}`);
  add(`Nombre de portails,${totalGates}`);
  addEmpty();

  // Matériaux
  add('MATÉRIAUX');
  add('Article,Qté,Unité,Coût unitaire,Total');
  materials.forEach((m) => {
    add(`${esc(m.product_name)},${m.quantity || 0},${esc(m.unit)},${(m.cost || 0).toFixed(2)},${((m.quantity || 0) * (m.cost || 0)).toFixed(2)}`);
  });
  if (materials.length === 0) add('Aucun matériau,,,');
  addEmpty();

  // Résumé des coûts
  add('RÉSUMÉ DES COÛTS');
  add(`Matériaux,${materialCost.toFixed(2)}`);
  add(`Main-d'œuvre,${laborCost.toFixed(2)}`);
  add(`Équipement,${(estimate?.equipment_cost || 0).toFixed(2)}`);
  add(`Sous-traitant,${(estimate?.subcontractor_cost || 0).toFixed(2)}`);
  add(`Autres,${(estimate?.other_cost || 0).toFixed(2)}`);
  add(`Coût direct,${directCost.toFixed(2)}`);
  add(`Frais généraux (${estimate?.overhead_percentage || 0}%),${overheadAmount.toFixed(2)}`);
  add(`Majoration (${estimate?.markup_percentage || 0}%),${markupAmount.toFixed(2)}`);
  addEmpty();

  // Totaux
  add('TOTAUX');
  add(`Sous-total,${sellingPrice.toFixed(2)}`);
  add(`Taxe (${estimate?.sales_tax_percentage || 0}%),${taxAmount.toFixed(2)}`);
  add(`Total,${customerTotal.toFixed(2)}`);
  addEmpty();

  // Termes
  add('TERMES ET CONDITIONS');
  add(esc(quote.terms || ''));
  if (quote.notes) {
    addEmpty();
    add('NOTES');
    add(esc(quote.notes));
  }

  const csv = rows.join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Devis_${quote.quote_number}_${(project.name || 'projet').replace(/\s/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function esc(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}