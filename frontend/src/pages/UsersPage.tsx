import { useTranslation } from "react-i18next";

const UsersPage = () => {
  const { t } = useTranslation();
  return (
    <div style={{ color: "#fff" }}>
      <h1>{t("users")}</h1>
      <p>User management will be expanded here.</p>
    </div>
  );
};

export default UsersPage;
