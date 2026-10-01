import { SourceCode } from "@koma/shared";
import { SOURCE_LABEL } from "../../store/app-store";

export function SourceSelector({ value, onChange }: { value: SourceCode; onChange: (source: SourceCode) => void }) {
  return (
    <div className="segment" role="tablist" aria-label="Джерело">
      {(["comx", "mangalib"] as SourceCode[]).map((code) => (
        <button key={code} type="button" role="tab" aria-selected={value === code} className={value === code ? "on" : ""} onClick={() => onChange(code)}>
          {SOURCE_LABEL[code]}
        </button>
      ))}
    </div>
  );
}
