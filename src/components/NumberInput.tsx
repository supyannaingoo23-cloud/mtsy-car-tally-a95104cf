import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatWhileTyping, parseNumber } from "@/lib/format";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | string;
  onChange: (n: number) => void;
  allowNegative?: boolean;
};

/**
 * Number input that displays the value with thousands separators while typing.
 * Emits the parsed numeric value via onChange.
 */
const NumberInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, allowNegative = false, ...rest }, ref) => {
    const [text, setText] = React.useState<string>(() =>
      value === "" || value === 0 || value === undefined || value === null
        ? ""
        : formatWhileTyping(String(value)),
    );

    // Keep external value in sync when it changes from outside
    React.useEffect(() => {
      const current = parseNumber(text);
      const next = typeof value === "number" ? value : parseNumber(String(value));
      if (current !== next) {
        setText(next === 0 ? "" : formatWhileTyping(String(next)));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      if (!allowNegative) raw = raw.replace(/-/g, "");
      const formatted = formatWhileTyping(raw);
      setText(formatted);
      onChange(parseNumber(formatted));
    };

    return (
      <Input
        ref={ref}
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        {...rest}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

export default NumberInput;
