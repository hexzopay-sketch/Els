"use client";
import Select from "react-select";

export interface Method {
    method: string;
    description: string;
    layer4: boolean;
    layer7: boolean;
    amplification: boolean;
    premium: boolean;
    concurrents: number;
    proxy: boolean;
}

interface MethodOption {
    value: string;
    label: string;
    premium: boolean;
}

interface MethodDropdownProps {
    methods: Method[];
    value: string;
    onChange: (value: string) => void;
}

export default function MethodDropdown({ methods, value, onChange }: MethodDropdownProps) {
    const options: MethodOption[] = methods.map((m) => ({
        value: m.method,
        label: `${m.method} [${m.description}]`,
        premium: m.premium,
    }));

    const groupedOptions = [
        {
            label: "Normal",
            options: options.filter((o) => !o.premium),
        },
        {
            label: "Premium",
            options: options.filter((o) => o.premium),
        },
    ];

    return (
        <Select
            options={groupedOptions}
            value={options.find((opt) => opt.value === value) || null}
            onChange={(opt) => onChange(opt?.value || "")}
            isSearchable
            placeholder="Search method..."
            styles={{
                control: (base) => ({
                    ...base,
                    backgroundColor: "#0d1117",
                    borderColor: "#30363d",
                    color: "#e6edf3",
                    minHeight: "34px",
                    borderRadius: "6px",
                    boxShadow: "none",
                    "&:hover": { borderColor: "#e6edf3" },
                }),
                singleValue: (base) => ({ ...base, color: "#e6edf3", fontSize: "13px" }),
                input: (base) => ({ ...base, color: "#e6edf3", fontSize: "13px" }),
                menu: (base) => ({ ...base, backgroundColor: "#161b22", border: "1px solid #30363d" }),
                option: (base, { isFocused, isSelected }) => ({
                    ...base,
                    backgroundColor: isSelected ? "#1f6feb" : isFocused ? "#21262d" : "transparent",
                    color: "white",
                    fontSize: "13px",
                }),
                groupHeading: (base) => ({
                    ...base,
                    color: "#8b949e",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "4px 8px",
                }),
                placeholder: (base) => ({ ...base, color: "#8b949e", fontSize: "13px" }),
            }}
            theme={(theme) => ({
                ...theme,
                colors: {
                    ...theme.colors,
                    primary: "#e6edf3",
                    primary25: "#21262d",
                },
            })}
        />
    );
}
