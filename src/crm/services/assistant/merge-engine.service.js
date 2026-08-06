function recordsOf(dataset) {
  return dataset?.result?.data || dataset?.data || [];
}

function mergeDatasets(datasets = []) {
  const mergedByDataset = datasets.map((dataset) => {
    const seen = new Set();
    const data = recordsOf(dataset).filter((record) => {
      const id = record?.id ?? record?.ID;
      if (id === undefined || id === null) return true;
      const key = String(id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ...dataset, result: { ...(dataset.result || {}), data } };
  });

  const merged = [];
  const seenAcrossModules = new Set();
  mergedByDataset.forEach((dataset) => recordsOf(dataset).forEach((record) => {
    const id = record?.id ?? record?.ID;
    const key = id === undefined || id === null ? null : `${dataset.module}:${String(id)}`;
    if (key && seenAcrossModules.has(key)) return;
    if (key) seenAcrossModules.add(key);
    merged.push({ ...record, _crmModule: dataset.module });
  }));

  return { datasets: mergedByDataset, records: merged };
}

module.exports = { mergeDatasets };
