"use client"

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

const frameworks = ["Ativo", "Inativo"]

export function ComboBoxLayout() {
    return (
        <Combobox items={frameworks}>
            <ComboboxInput placeholder="Selecione Um Status" />
            <ComboboxContent>
                <ComboboxEmpty>Nenhum Status Encontrado!</ComboboxEmpty>
                <ComboboxList>
                    {(item) => (
                        <ComboboxItem key={item} value={item}>
                            {item}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}