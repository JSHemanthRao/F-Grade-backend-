const MODULE_ALIASES = {
  leads: ['lead', 'prospect', 'prospects'],
  accounts: ['account', 'customer', 'customers', 'company', 'companies', 'business', 'businesses'],
  deals: ['deal', 'opportunity', 'opportunities', 'sales'],
  events: ['meeting', 'meetings', 'appointment', 'appointments', 'event', 'events'],
};

function detectModules(question) {
  const normalizedQuestion = String(question || '').trim().toLowerCase();
  const detected = [];

  Object.entries(MODULE_ALIASES).forEach(([moduleKey, aliases]) => {
    if (aliases.some((alias) => normalizedQuestion.includes(alias))) {
      detected.push(moduleKey);
    }
  });

  return detected.length > 0 ? detected : ['deals'];
}

module.exports = {
  detectModules,
};
