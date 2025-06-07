import Button from "./Button";
import React from "react";

interface ButtonGroupProps<T> {
  options: { label: string; value: T }[];
  selected: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function ButtonGroup<T>({
  options,
  selected,
  onChange,
}: ButtonGroupProps<T>) {
  return (
    <div className={`flex bg-gray-800 rounded-full p-1`}>
      {options.map(({ label, value }) => (
        <Button
          key={label.toString()}
          text={label}
          selected={value === selected}
          onClick={() => onChange(value)}
        />
      ))}
    </div>
  );
}