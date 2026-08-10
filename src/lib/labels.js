// French label maps for enum values stored in English in the database

export const projectStatusLabels = {
  New: 'Nouveau',
  Estimating: 'En estimation',
  'Quote Ready': 'Devis prêt',
  Submitted: 'Soumis',
  Won: 'Gagné',
  Lost: 'Perdu',
  Archived: 'Archivé',
};

export const quoteStatusLabels = {
  Draft: 'Brouillon',
  Sent: 'Envoyé',
  Accepted: 'Accepté',
  Rejected: 'Refusé',
  Expired: 'Expiré',
};

export const productCategoryLabels = {
  Posts: 'Poteaux',
  Fabric: 'Toile',
  Rails: 'Rails',
  Gates: 'Portails',
  Fittings: 'Raccords',
  Hardware: 'Quincaillerie',
  Concrete: 'Béton',
  Lumber: 'Bois',
  Fasteners: 'Fixations',
  Labor: 'Main-d\'œuvre',
  Equipment: 'Équipement',
  Other: 'Autre',
};

export const projectStatusFilters = ['All', 'New', 'Estimating', 'Quote Ready', 'Submitted', 'Won', 'Lost'];
export const projectStatusFilterLabels = {
  All: 'Tous',
  ...projectStatusLabels,
};

export function projectStatusLabel(status) {
  return projectStatusLabels[status] || status;
}

export function quoteStatusLabel(status) {
  return quoteStatusLabels[status] || status;
}