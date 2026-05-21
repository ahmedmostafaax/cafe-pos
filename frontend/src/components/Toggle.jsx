export default function Toggle({ on, onChange }) {
  return (
    <div className={`tgl${on ? " on" : ""}`} onClick={() => onChange(!on)}>
      <div className="tglk" />
    </div>
  );
}
