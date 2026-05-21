import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../hooks/useApp";
import useSocketStatus from "../hooks/useSocketStatus";
import socket from "../lib/socket";
import {
  COMMISSION_ROLE_LABELS,
  PATH_ROLES,
  ROLE_LABELS,
  ROLE_PATHS,
} from "../lib/constants";

// /pad 是独立平板代点工作站，**不**通过 TopBar 切换进入，只能通过 URL /pad 直达。
const SWITCHABLE_ROLES = ["front", "kitchen", "bar", "admin"];

function SocketIndicator({ status }) {
  const handleReconnect = () => {
    if (status === "disconnected") socket.connect();
  };
  if (status === "connected") {
    return <span className="tb-socket connected" title="已连接" aria-label="已连接" />;
  }
  if (status === "reconnecting") {
    return <span className="tb-socket reconnecting" title="重连中..." aria-label="重连中" />;
  }
  return (
    <span
      className="tb-socket disconnected"
      title="离线 · 点击重连"
      role="button"
      tabIndex={0}
      onClick={handleReconnect}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && handleReconnect()}
      aria-label="离线，点击重连"
    >
      <span className="tb-socket-label">离线</span>
    </span>
  );
}

export default function TopBar({ variant = "default" }) {
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const socketStatus = useSocketStatus();
  const isPad = variant === "pad";
  const role = isPad ? "tablet" : (PATH_ROLES[location.pathname] || user?.roles[0]);
  const switchableRoles = (user?.roles || []).filter((r) => SWITCHABLE_ROLES.includes(r));

  return (
    <div className={`tb${isPad ? " pad-topbar" : ""}`}>
      <div className="tb-brand">
        Cafe POS&nbsp;<em style={{ fontStyle: "italic", color: "var(--acc2)", fontFamily: "var(--serif)" }}>Demo</em>
      </div>
      <div className="tb-sep" />
      <div className="tb-page">{ROLE_LABELS[role] || COMMISSION_ROLE_LABELS[role] || role}</div>

      {isPad ? (
        <div className="pad-topbar-spacer" />
      ) : switchableRoles.length > 1 ? (
        <div className="rb">
          {switchableRoles.map((nextRole) => (
            <button key={nextRole} className={`rbtn${role === nextRole ? " a" : ""}`} onClick={() => navigate(ROLE_PATHS[nextRole])}>
              {ROLE_LABELS[nextRole]}
            </button>
          ))}
          <button className={`rbtn${location.pathname === "/commission" ? " a" : ""}`} onClick={() => navigate("/commission")}>
            提成
          </button>
        </div>
      ) : (
        <div className="rb">
          <button className={`rbtn${location.pathname === "/commission" ? " a" : ""}`} onClick={() => navigate("/commission")}>
            提成
          </button>
        </div>
      )}

      <div className="tb-user">{user?.name}</div>
      <SocketIndicator status={socketStatus} />
      <button className="lo-btn" onClick={() => { setUser(null); navigate(isPad ? "/pad/login" : "/login"); }}>退出</button>
    </div>
  );
}
