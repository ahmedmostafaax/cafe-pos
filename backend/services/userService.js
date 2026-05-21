const { rowToUser, userToRow } = require('../models/mappers');

function createUserService({ statements }) {
  const { stmtGetAllUsers, stmtGetUserById, stmtInsertUser, stmtUpdateUser, stmtDeleteUser } = statements;

  function getAllUsers() { return stmtGetAllUsers.all().map(rowToUser); }
  function saveUser(userData) {
    if(!userData||!userData.id||!userData.username) return null;
    const existingUser = stmtGetUserById.get(userData.id);
    const existingUserData = existingUser ? rowToUser(existingUser) : null;
    const normalizedUser = existingUser && !userData.password
      ? { ...existingUserData, ...userData, password: existingUserData.password }
      : userData;
    const row = userToRow(normalizedUser);
    if(existingUser) stmtUpdateUser.run(row); else stmtInsertUser.run(row);
    return getAllUsers();
  }
  function deleteUser(id) {
    if(!id) return null;
    stmtDeleteUser.run(id);
    return getAllUsers();
  }

  return { getAllUsers, saveUser, deleteUser };
}

module.exports = { createUserService };
