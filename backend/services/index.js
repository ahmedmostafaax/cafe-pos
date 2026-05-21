const { createSettingsService } = require('./settingsService');
const { createUserService } = require('./userService');
const { createMenuService } = require('./menuService');
const { createUploadService } = require('./uploadService');
const { createOrderService } = require('./orderService');
const { createReportService } = require('./reportService');
const { createTableService } = require('./tableService');

function createServices(dbContext) {
  const settings = createSettingsService(dbContext);
  const users = createUserService(dbContext);
  const menu = createMenuService(dbContext);
  const uploads = createUploadService(dbContext);
  const orders = createOrderService(dbContext);
  const tables = createTableService();
  const reports = createReportService({ ...dbContext, userService: users, settingsService: settings });
  return { settings, users, menu, uploads, orders, tables, reports };
}

module.exports = { createServices };

