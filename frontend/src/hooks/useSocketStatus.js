import { useEffect, useState } from "react";
import socket from "../lib/socket";

export default function useSocketStatus() {
  const [status, setStatus] = useState(() => (socket.connected ? "connected" : "reconnecting"));

  useEffect(() => {
    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onReconnectAttempt = () => setStatus("reconnecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io?.on?.("reconnect_attempt", onReconnectAttempt);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io?.off?.("reconnect_attempt", onReconnectAttempt);
    };
  }, []);

  return status;
}
