const EmptyState = ({
  title = "لا يوجد شيء هنا بعد",
  subtitle = "جرّب لاحقاً أو أضف عنصراً جديداً",
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="text-center py-14 px-4">
    <div className="text-4xl mb-3">☕</div>
    <h3 className="font-bold text-[#2c241c]">{title}</h3>
    <p className="text-sm text-[#7a6a5c] mt-1 max-w-xs mx-auto">{subtitle}</p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
export default EmptyState;
