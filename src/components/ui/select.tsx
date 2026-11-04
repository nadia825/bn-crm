"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; disabled?: boolean };
type SelectProps = Omit<
  ComponentProps<"select">,
  "multiple" | "size" | "ref"
> & {
  options?: string[];
  label?: string;
};

function readOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child): Option[] => {
    if (!isValidElement<ComponentProps<"option">>(child)) return [];
    if (child.type === Fragment) return readOptions(child.props.children);
    if (child.type !== "option") return [];
    const label =
      child.props.label ?? Children.toArray(child.props.children).join("");
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: child.props.disabled,
      },
    ];
  });
}

/** Shared visual menu with a native form control for validation and FormData. */
export function Select({
  options,
  children,
  label,
  className,
  value,
  defaultValue,
  onChange,
  onInvalid,
  disabled,
  required,
  autoFocus,
  id,
  style,
  title,
  tabIndex,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  ...nativeProps
}: SelectProps) {
  const items =
    options?.map((option) => ({
      value: option,
      label: option || "Not selected",
      disabled: false,
    })) ?? readOptions(children);
  const initialValue = String(defaultValue ?? items[0]?.value ?? "");
  const [localValue, setLocalValue] = useState(initialValue);
  const [invalid, setInvalid] = useState(false);
  const selected = value === undefined ? localValue : String(value);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const form = nativeRef.current?.form;
    const reset = () => {
      setLocalValue(initialValue);
      setInvalid(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initialValue]);

  return (
    <>
      <SelectPrimitive.Root
        value={`option:${selected}`}
        disabled={disabled}
        onValueChange={(next) => {
          const native = nativeRef.current;
          if (!native) return;
          native.value = next.slice("option:".length);
          // Dispatch a real select change so existing handlers retain their event API.
          native.dispatchEvent(new Event("change", { bubbles: true }));
        }}
      >
        <SelectPrimitive.Trigger
          ref={triggerRef}
          id={id}
          className={cn("input select dashboard-select", className)}
          aria-label={ariaLabel ?? label}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid ?? (invalid || undefined)}
          aria-required={required || undefined}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          title={title}
          style={style}
        >
          <span className="dashboard-select-value">
            <SelectPrimitive.Value />
          </span>
          <SelectPrimitive.Icon className="dashboard-select-icon">
            <ChevronDown size={14} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="dashboard-select-menu"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="dashboard-select-scroll">
              <ChevronUp size={14} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="dashboard-select-viewport">
              {items.map((item) => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={`option:${item.value}`}
                  disabled={item.disabled}
                  className="dashboard-select-item"
                  textValue={item.label}
                >
                  <SelectPrimitive.ItemText>
                    {item.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="dashboard-select-check">
                    <Check size={14} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="dashboard-select-scroll">
              <ChevronDown size={14} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      <select
        {...nativeProps}
        ref={nativeRef}
        className="dashboard-select-native"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        required={required}
        value={selected}
        onChange={(event) => {
          setLocalValue(event.target.value);
          setInvalid(false);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          triggerRef.current?.focus();
          onInvalid?.(event);
        }}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </select>
    </>
  );
}
