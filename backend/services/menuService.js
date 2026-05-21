const { rowToMenuItem, menuItemToRow } = require('../models/mappers');

function createMenuService({ statements }) {
  const { stmtGetAllMenu, stmtGetMenuById, stmtInsertMenu, stmtUpdateMenu, stmtDeleteMenu, stmtGetAllCats, stmtReplaceCats } = statements;

  function getAllMenu() { return stmtGetAllMenu.all().map(rowToMenuItem); }
  function getAllCats() { return stmtGetAllCats.all().map(r => r.name); }
  function saveMenuItem(item) {
    if(!item||!item.id||!item.name) return null;
    const row = menuItemToRow(item);
    if(stmtGetMenuById.get(item.id)) stmtUpdateMenu.run(row); else stmtInsertMenu.run(row);
    return getAllMenu();
  }
  function deleteMenuItem(id) {
    if(!id) return null;
    stmtDeleteMenu.run(id);
    return getAllMenu();
  }
  function saveCategories(cats) {
    if(!Array.isArray(cats)) return null;
    stmtReplaceCats(cats);
    return getAllCats();
  }

  return { getAllMenu, getAllCats, saveMenuItem, deleteMenuItem, saveCategories };
}

module.exports = { createMenuService };
