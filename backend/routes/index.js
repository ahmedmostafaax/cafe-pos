function registerRoutes(app, services) {
  const { orders, tables, users, menu, settings, uploads, reports } = services;

  app.get('/api/health', (req,res) => res.json({status:'ok',timestamp:Date.now()}));
  app.get('/api/orders', (req,res) => {
    try { res.json(orders.listOrders(req.query)); }
    catch(err){res.status(500).json({error:err.message});}
  });
  app.get('/api/orders/table/:tableId', (req,res) => {
    try{res.json(orders.getOrdersByTable(req.params.tableId));}
    catch(err){res.status(500).json({error:err.message});}
  });
  app.get('/api/orders/:id', (req,res) => {
    try{const r=orders.getOrderById(req.params.id);if(!r)return res.status(404).json({error:'不存在'});res.json(r);}
    catch(err){res.status(500).json({error:err.message});}
  });
  app.get('/api/tables', (req,res) => res.json(tables.getTables()));
  app.get('/api/users', (req,res) => { try{res.json(users.getAllUsers());}catch(err){res.status(500).json({error:err.message});} });
  app.get('/api/menu', (req,res) => { try{res.json(menu.getAllMenu());}catch(err){res.status(500).json({error:err.message});} });
  app.get('/api/categories', (req,res) => { try{res.json(menu.getAllCats());}catch(err){res.status(500).json({error:err.message});} });
  app.get('/api/settings', (req,res) => { try{res.json(settings.getSettingsMap());}catch(err){res.status(500).json({error:err.message});} });
  app.post('/api/uploads/menu-image', (req,res) => {
    try {
      const url = uploads.saveMenuImageUpload(req.body || {});
      res.json({ ok:true, url });
    } catch(err) {
      res.status(err.statusCode || 500).json({ ok:false, message:err.message || '图片上传失败' });
    }
  });
  app.get('/api/dashboard', (req,res) => { try{res.json(reports.computeDashboard(req.query.range||'today', req.query));}catch(err){res.status(400).json({error:err.message});} });
  app.get('/api/commissions', (req,res) => {
    try { res.json(reports.buildCommissionReport(req.query)); }
    catch(err){res.status(400).json({error:err.message});}
  });
  app.get('/api/commissions/report', (req,res) => {
    try { res.json(reports.buildCommissionReport(req.query)); }
    catch(err){res.status(400).json({error:err.message});}
  });
  app.get('/api/reports/daily/:day', (req,res) => {
    try {
      const report = reports.getDailyReport(req.params.day);
      if (!report) return res.status(404).json({error:'日结不存在'});
      res.json(report);
    } catch(err) { res.status(500).json({error:err.message}); }
  });
  app.post('/api/reports/daily', (req,res) => {
    try {
      const day = req.query.day || req.body?.day || reports.getReportDayKey(Date.now());
      res.json(reports.saveDailyReport(day));
    } catch(err) { res.status(500).json({error:err.message}); }
  });
}

module.exports = { registerRoutes };

