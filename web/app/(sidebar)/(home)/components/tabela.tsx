import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type Column<T> = {
    key: keyof T;
    label: string;
    className?: string;
}

type TabelaProps<T> = {
    columns: readonly Column<T>[];
    data: T[];
    caption?: string;
}

export default function Tabela<T>({
    columns,
    data,
    caption,
}: TabelaProps<T>) {
    return (
        <div className="w-full overflow-x-auto">
            <Table className="min-w-[600px]">
                {caption && (
                    <caption className="text-muted-foreground mt-4 text-sm">
                        {caption}
                    </caption>
                )}

                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead
                                key={String(column.key)}
                                className={column.className}
                            >
                                {column.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index}>
                            {columns.map((column) => (
                                <TableCell
                                    key={String(column.key)}
                                    className={column.className}
                                >
                                    {String(row[column.key])}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}