import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-[oklch(0.922_0_0)] bg-white outline-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 aria-checked:border-[oklch(0.205_0_0)] aria-checked:bg-[oklch(0.205_0_0)] aria-checked:text-[oklch(0.985_0_0)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current [&>svg]:size-3">
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
