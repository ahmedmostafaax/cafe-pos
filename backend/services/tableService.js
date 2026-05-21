function createTableService() {
  let tablesSnapshot = {};
  function getTables() {
    return tablesSnapshot;
  }
  function updateTables(data) {
    tablesSnapshot = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    return tablesSnapshot;
  }
  return { getTables, updateTables };
}

module.exports = { createTableService };

