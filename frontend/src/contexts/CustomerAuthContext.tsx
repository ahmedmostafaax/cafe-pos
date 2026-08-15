import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { customerLogin, customerRegister, customerMe } from "../api/customer";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Ctx {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string, captchaId: string, captchaAnswer: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
}

const CustomerAuthContext = createContext<Ctx | undefined>(undefined);

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("customer_token");
    if (!token) {
      setLoading(false);
      return;
    }
    customerMe()
      .then(setCustomer)
      .catch(() => Cookies.remove("customer_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string, captchaId: string, captchaAnswer: string) => {
    const res = await customerLogin({ email, password, captchaId, captchaAnswer });
    Cookies.set("customer_token", res.token, { expires: 7 });
    setCustomer(res.data.customer);
  };

  const register = async (payload: any) => {
    const res = await customerRegister(payload);
    Cookies.set("customer_token", res.token, { expires: 7 });
    setCustomer(res.data.customer);
  };

  const logout = () => {
    Cookies.remove("customer_token");
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, loading, login, register, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth outside provider");
  return ctx;
};
