import { Link, useLocation } from "react-router-dom";

type Props = {
  cartCount?: number;
  onCart?: () => void;
  rightSlot?: React.ReactNode;
  title?: string;
  subtitle?: string;
};

const PublicHeader = ({ cartCount = 0, onCart, rightSlot, title = "GODZ Café", subtitle }: Props) => {
  const loc = useLocation();
  const isOrder = loc.pathname.startsWith("/order");

  return (
    <header
      className="sticky top-0 z-50 bg-[#fffcf8]/92 backdrop-blur-md border-b border-[#e6dcd0]"
      style={{ paddingTop: "var(--safe-t)" }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link to="/order" className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#9c6b4a] to-[#6f4a32] text-white flex items-center justify-center shadow-sm shrink-0">
            ☕
          </span>
          <div className="min-w-0">
            <div className="font-bold text-[#2c241c] text-sm sm:text-base truncate">{title}</div>
            {subtitle && <div className="text-[10px] text-[#9c6b4a] truncate">{subtitle}</div>}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[#6f4a32]">
          <a href={isOrder ? "#menu" : "/order#menu"} className="hover:text-[#9c6b4a]">القائمة</a>
          <a href={isOrder ? "#featured" : "/order#featured"} className="hover:text-[#9c6b4a]">مختارات</a>
          <a href={isOrder ? "#about" : "/order#about"} className="hover:text-[#9c6b4a]">عنّا</a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {rightSlot}
          {onCart && (
            <button type="button" onClick={onCart} className="relative carolina-btn !min-h-[40px] !px-3 sm:!px-4 text-xs sm:text-sm">
              السلة
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[1.15rem] h-5 px-1 rounded-full bg-[#2c241c] text-[#2c241c] text-[10px] flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;

