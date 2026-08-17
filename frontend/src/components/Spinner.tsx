const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="w-10 h-10 rounded-full border-[3px] border-[#e6dcd0] border-t-[#9c6b4a] animate-spin-slow" />
    <p className="text-sm text-[#7a6a5c]">لحظات من فضلك...</p>
  </div>
);
export default Spinner;
