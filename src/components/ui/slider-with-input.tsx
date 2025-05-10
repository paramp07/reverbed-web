"use client";

import { useSliderWithInput } from "@/components/hooks/use-slider-with-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw } from "lucide-react";
import { ReactNode } from "react";

interface SliderWithInputProps {
  label: string;
  minValue?: number;
  maxValue?: number;
  initialValue?: number;
  defaultValue?: number;
  step?: number;
  tooltipContent?: (value: number) => ReactNode;
  onChange?: (value: number) => void;
  className?: string;
}

export function SliderWithInput({
  label,
  minValue = 0,
  maxValue = 1,
  initialValue = 0.5,
  defaultValue = 0.5,
  step = 0.01,
  tooltipContent,
  onChange,
  className,
}: SliderWithInputProps) {
  const {
    sliderValue,
    inputValues,
    validateAndUpdateValue,
    handleInputChange,
    handleSliderChange,
    resetToDefault,
  } = useSliderWithInput({
    minValue,
    maxValue,
    initialValue: [initialValue],
    defaultValue: [defaultValue],
  });

  // Call the onChange prop when the slider value changes
  const handleChange = (newValue: number[]) => {
    handleSliderChange(newValue);
    if (onChange && newValue[0] !== undefined) {
      onChange(newValue[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-1">
        <Label className="text-white tracking-wide uppercase text-xs">{label}</Label>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-5 p-0"
                  aria-label="Reset"
                  onClick={resetToDefault}
                >
                  <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="px-2 py-1 text-xs">Reset to default</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            className="h-6 max-w-[4.4rem] px-1 py-0 bg-zinc-800 border-zinc-700 text-xs text-white text-center"
            type="text"
            inputMode="decimal"
            value={inputValues[0]}
            onChange={(e) => handleInputChange(e, 0)}
            onBlur={() => validateAndUpdateValue(inputValues[0], 0)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                validateAndUpdateValue(inputValues[0], 0);
              }
            }}
            aria-label="Enter value"
          />
        </div>
      </div>
      <Slider
        className="w-full"
        value={sliderValue}
        onValueChange={handleChange}
        min={minValue}
        max={maxValue}
        step={step}
        aria-label={label}
      />
    </div>
  );
}
