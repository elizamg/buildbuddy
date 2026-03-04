import { BuilderShellProps as BuilderShellProps } from "@/lib/types";

export default function BuilderShell(
    { header, leftPanel, topRight, bottomRight, middleRight }: BuilderShellProps
) {
  return (
    <div className="flex flex-col h-screen">
      {header}
      <div className="grid grid-cols-[360px_1fr] gap-4 flex-1 min-h-0">
        <div className="h-full min-h-0">
          {leftPanel}
        </div>
        <div className="flex flex-col gap-4 py-4 px-4 overflow-y-auto min-h-0">
          {topRight}
          {middleRight}
          {bottomRight}
        </div>
      </div>
    </div>
  );
}
