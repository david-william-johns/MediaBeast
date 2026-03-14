import { useUiStore } from "../../store/uiStore";

export default function StatusBar() {
  const { status, statusType } = useUiStore();

  const color =
    statusType === "success" ? "text-green-400" :
    statusType === "error"   ? "text-red-400" :
    "text-muted";

  return (
    <div className={`h-6 px-3 flex items-center bg-surface border-t border-border text-xs ${color} shrink-0`}>
      {status}
    </div>
  );
}
