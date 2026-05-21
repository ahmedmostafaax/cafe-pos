function registerSocketHandlers(io, services) {
  const { orders, tables, users, menu, settings } = services;

  io.on('connection', (socket) => {
    console.log('🔌 客户端已连接：'+socket.id);

    socket.on('get_initial_data', () => {
      try {
        socket.emit('initial_data', {
          orders: orders.getActiveOrders(),
          tables: tables.getTables(),
          users: users.getAllUsers(),
          menu: menu.getAllMenu(),
          cats: menu.getAllCats(),
          settings: settings.getSettingsMap(),
        });
      } catch(err) { console.error('❌ 初始数据失败：',err.message); socket.emit('error',{message:'获取初始数据失败'}); }
    });

    socket.on('new_order', (order, ack) => {
      try {
        const created = orders.createOrder(order);
        if (created) io.emit('order_created', created);
        if (typeof ack === 'function') ack({ ok: true, order: created });
      } catch(err) {
        if(err.message.includes('UNIQUE constraint')){
          if (typeof ack === 'function') ack({ ok: false, message: '订单号冲突，请重试' });
          return;
        }
        if (typeof ack === 'function') ack({ ok: false, message: err.statusCode === 400 ? err.message : '新建订单失败' });
        if (err.statusCode === 400) socket.emit('error',{message:err.message});
        else console.error('❌ 新建订单失败：',err.message);
      }
    });

    socket.on('update_status', (payload) => {
      try { const u = orders.updateStatus(payload || {}); if(u) io.emit('order_updated',u); }
      catch(err) { console.error('❌ 更新状态失败：',err.message); }
    });

    socket.on('update_items', (payload) => {
      try { const u = orders.updateItems(payload || {}); if(u) io.emit('order_updated',u); }
      catch(err) { console.error('❌ 更新明细失败：',err.message); }
    });

    socket.on('update_tables', (data) => {
      io.emit('tables_updated', tables.updateTables(data));
    });

    socket.on('delete_order', (payload = {}, ack) => {
      try {
        const result = orders.deleteOrder(payload || {});
        io.emit('order_deleted', { id: result.id });
        if (typeof ack === 'function') ack({ ok:true, id: result.id });
      } catch(err) {
        if (typeof ack === 'function') ack({ ok:false, message:err.statusCode === 404 ? '订单不存在' : err.statusCode === 400 ? err.message : '删除订单失败' });
        if (err.statusCode === 404) socket.emit('error',{message:'订单不存在'});
        else if (err.statusCode !== 400) { console.error('❌ 删除订单失败：',err.message); socket.emit('error',{message:'删除订单失败'}); }
      }
    });

    socket.on('save_user', (userData) => {
      try { const updated = users.saveUser(userData); if (updated) io.emit('users_updated', updated); }
      catch(err) {
        if(err.message.includes('UNIQUE constraint')){socket.emit('error',{message:'账号已存在'}); return;}
        console.error('❌ 保存用户失败：',err.message);
      }
    });

    socket.on('delete_user', ({id}) => {
      try { const updated = users.deleteUser(id); if (updated) io.emit('users_updated', updated); }
      catch(err) { console.error('❌ 删除用户失败：',err.message); }
    });

    socket.on('save_menu_item', (item) => {
      try { const updated = menu.saveMenuItem(item); if (updated) io.emit('menu_updated', updated); }
      catch(err) { console.error('❌ 保存菜品失败：',err.message); }
    });

    socket.on('delete_menu_item', ({id}) => {
      try { const updated = menu.deleteMenuItem(id); if (updated) io.emit('menu_updated', updated); }
      catch(err) { console.error('❌ 删除菜品失败：',err.message); }
    });

    socket.on('save_categories', (cats) => {
      try { const updated = menu.saveCategories(cats); if (updated) io.emit('cats_updated', updated); }
      catch(err) { console.error('❌ 保存分类失败：',err.message); }
    });

    socket.on('save_settings', (nextSettings) => {
      try {
        if(!nextSettings || typeof nextSettings !== 'object' || Array.isArray(nextSettings)) return;
        io.emit('settings_updated', settings.saveSettings(nextSettings));
      } catch(err) { console.error('❌ 保存设置失败：',err.message); socket.emit('error',{message:'保存设置失败'}); }
    });

    socket.on('report_payment', ({ id, method }) => {
      try { const updated = orders.reportPayment({ id, method }); if (updated) io.emit('order_updated', updated); }
      catch(err) { console.error('❌ 报告支付失败：',err.message); }
    });

    socket.on('disconnect', (reason) => { console.log('🔌 断开：'+socket.id+'('+reason+')'); });
  });
}

module.exports = { registerSocketHandlers };
