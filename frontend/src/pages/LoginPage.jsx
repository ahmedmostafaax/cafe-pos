import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../hooks/useApp";
import { ROLE_PATHS } from "../lib/constants";

const VARIANT_CONFIG = {
  main: {
    badge: "Staff Sign-in",
    title: "欢迎回来",
    sub: "请使用工号或用户名登录，以进入对应的工作台",
    allowedRoles: null,
    defaultTarget: null,
    blockMessage: "",
    wrapperClass: "",
  },
  pad: {
    badge: "Tablet Sign-in · /pad",
    title: "平板代点登录",
    sub: "请使用平板代点账号登录，登录后进入 /pad 工作台。",
    allowedRoles: ["front", "admin"],
    defaultTarget: "/pad",
    blockMessage: "该账号无权进入平板代点工作台",
    wrapperClass: "lw-variant-pad",
  },
  phone: {
    badge: "Admin Phone · /adminphone",
    title: "手机后台登录",
    sub: "请使用管理员账号登录，登录后进入手机端后台。",
    allowedRoles: ["admin"],
    defaultTarget: "/adminphone",
    blockMessage: "仅管理员可进入手机后台",
    wrapperClass: "lw-variant-phone",
  },
};

export default function LoginPage({ variant = "main" }) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.main;
  const { authBootstrapReady, setUser, user, users, usersLoading, usersLoadError, loadUsers } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const isRoleAllowed = (roles) => !config.allowedRoles || config.allowedRoles.some((role) => roles.includes(role));

  useEffect(() => {
    if (!authBootstrapReady || !user) return;
    if (isRoleAllowed(user.roles)) {
      const fallback = config.defaultTarget || ROLE_PATHS[user.roles[0]] || "/admin";
      navigate(location.state?.from?.pathname || fallback, { replace: true });
    } else if (config.blockMessage) {
      setErr(config.blockMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authBootstrapReady, user]);

  const go = () => {
    setErr("");
    if (usersLoading) return;
    if (!users.length) { if (usersLoadError) { loadUsers(); return; } setErr("暂无可登录账号"); return; }
    const found = users.find((item) => item.username === username && item.password === password);
    if (!found) { setErr("账号或密码错误"); return; }
    if (!isRoleAllowed(found.roles)) { setErr(config.blockMessage || "该账号无权进入此入口"); return; }
    setUser(found);
    const fallback = config.defaultTarget || ROLE_PATHS[found.roles[0]];
    navigate(location.state?.from?.pathname || fallback, { replace: true });
  };

  const actionLabel = usersLoading ? "连接中..." : usersLoadError ? "重试连接" : users.length ? "登 录" : "暂无账号";
  const actionDisabled = usersLoading || (!users.length && !usersLoadError);
  const helperError = err || usersLoadError;

  return (
    <div className={`lw${config.wrapperClass ? ` ${config.wrapperClass}` : ""}`}>
      {/* 左侧品牌区 */}
      <div className="l-hero">
        <div className="l-hero-logo">Cafe POS <em>Demo</em></div>
        <div className="l-hero-tagline">
          <div className="l-hero-kicker">Since MMXXIV · Restaurant OS</div>
          <h1 className="l-hero-main">像准备一顿家宴 <em>那样</em> 准备每一单。</h1>
          <p className="l-hero-sub">
            披萨、欧包、沙拉、甜品在后厨；咖啡、鸡尾酒、软饮在吧台。
            一台设备，<em>一次点单</em>，到达两个出品口。
          </p>
        </div>
        <div className="l-hero-footer">
          <span>v5.0 · Demo POS</span>
          <span>Cafe Demo</span>
        </div>
      </div>

      {/* 右侧登录卡 */}
      <div className="lc">
        <div className="l-badge">{config.badge}</div>
        <div className="l-title">{config.title}</div>
        <div className="l-sub">{config.sub}</div>
        <div className="fg">
          <label className="fl">用户名 / Username</label>
          <input className="fi" value={username} onChange={(e) => { setUsername(e.target.value); if (err) setErr(""); }} placeholder="例如 liuying" onKeyDown={(e) => e.key === "Enter" && go()} autoFocus />
        </div>
        <div className="fg">
          <label className="fl">密码 / Password</label>
          <input className="fi" type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (err) setErr(""); }} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && go()} />
        </div>
        <button className="btn-login" onClick={go} disabled={actionDisabled}>{actionLabel}</button>
        {helperError && <div className="l-err">{helperError}</div>}
      </div>
    </div>
  );
}
