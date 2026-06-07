"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VizFieldSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
};

export function VizFieldSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder = "Pilih kolom",
  emptyMessage = "Tidak ada kolom tersedia",
  className,
}: VizFieldSelectProps) {
  return (
    <div className={className ?? "flex min-w-[180px] flex-1 flex-col gap-2"}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={options.length === 0}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={options.length === 0 ? emptyMessage : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
