import { BuilderShellProps as BuilderShellProps } from "@/lib/types";

export default function BuilderShell(
    { header, leftPanel, topRight, bottomRight }: BuilderShellProps
) {
  return (
    <div>
        {header}
        <div className="grid grid-cols-[360px_1fr] gap-4">
            {leftPanel}
            <div className="flex flex-col gap-4">
                {topRight}
                {bottomRight}
            </div>
        </div>
    </div>
  );
}
