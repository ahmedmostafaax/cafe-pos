export const CardSkeleton = () => (
  <div className="carolina-card">
    <div className="aspect-[5/3] skeleton" />
    <div className="p-4 space-y-2">
      <div className="h-4 w-2/3 skeleton" />
      <div className="h-3 w-full skeleton" />
      <div className="h-10 w-full skeleton mt-2" />
    </div>
  </div>
);

export const ListSkeleton = ({ n = 4 }: { n?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="h-16 skeleton" />
    ))}
  </div>
);

export default CardSkeleton;
