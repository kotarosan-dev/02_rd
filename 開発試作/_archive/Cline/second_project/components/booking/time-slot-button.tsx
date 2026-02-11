"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSlotButtonProps {
  time: string;
  available: boolean;
  selected: boolean;
  onClick: () => void;
}

export function TimeSlotButton({
  time,
  available,
  selected,
  onClick,
}: TimeSlotButtonProps) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      className={cn(
        "w-full",
        available
          ? "hover:bg-primary hover:text-primary-foreground"
          : "opacity-50 cursor-not-allowed",
        selected && "bg-primary text-primary-foreground"
      )}
      disabled={!available}
      onClick={onClick}
    >
      {time}
    </Button>
  );
}