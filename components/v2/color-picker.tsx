'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const BRAND_COLORS = [
  { name: 'blue', label: 'Blue', hex: '#3b82f6' },
  { name: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { name: 'purple', label: 'Purple', hex: '#a855f7' },
  { name: 'pink', label: 'Pink', hex: '#ec4899' },
  { name: 'red', label: 'Red', hex: '#ef4444' },
  { name: 'orange', label: 'Orange', hex: '#f97316' },
  { name: 'amber', label: 'Amber', hex: '#f59e0b' },
  { name: 'green', label: 'Green', hex: '#22c55e' },
  { name: 'emerald', label: 'Emerald', hex: '#10b981' },
  { name: 'cyan', label: 'Cyan', hex: '#06b6d4' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <Label>Brand Color</Label>
      <div className="grid grid-cols-5 gap-3">
        {BRAND_COLORS.map((color) => (
          <Button
            key={color.name}
            variant={value === color.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(color.name)}
            disabled={disabled}
            className={`w-full h-12 rounded-lg transition-all ${
              value === color.name
                ? `bg-${color.name}-500 border-2 border-${color.name}-600 ring-2 ring-offset-2 ring-${color.name}-300`
                : `hover:border-${color.name}-300`
            }`}
            title={color.label}
          >
            <div
              className="w-6 h-6 rounded-md"
              style={{ backgroundColor: color.hex }}
            />
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Choose your organization's brand color. This will be used throughout the admin dashboard.
      </p>
    </div>
  );
}
