"use client"

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

type Situation = "ACTIVE" | "INACTIVE" | "";

interface ComboBoxLayoutProps {
    value: Situation;
    onValueChange: (value: Situation) => void;
}

const situations: Situation[] = ["ACTIVE", "INACTIVE"];

const situationLabels: Record<Exclude<Situation, "">, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
};

export function ComboBoxLayout({
    value,
    onValueChange,
}: ComboBoxLayoutProps) {
    return (
        <Combobox
            items={situations}
            value={value}
            onValueChange={(value) => {
                if (value !== null) {
                    onValueChange(value);
                }
            }}
            itemToStringLabel={(item) => situationLabels[item as Exclude<Situation, "">] ?? ""}
            itemToStringValue={(item) => item}
        >
            <ComboboxInput placeholder="Selecione Um Status" />

            <ComboboxContent>
                <ComboboxEmpty>
                    Nenhum Status Encontrado!
                </ComboboxEmpty>

                <ComboboxList>
                    {(item) => (
                        <ComboboxItem key={item} value={item}>
                            {situationLabels[item as Exclude<Situation, "">]}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}