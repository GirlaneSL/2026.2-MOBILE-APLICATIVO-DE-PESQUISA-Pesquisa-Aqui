import { Chart } from "./grafico";

type EstatisticasChartProps = {
    valor: string | number;
    chartData?: { month: string; Pesquisas: number }[];
    variant?: "line" | "bar";
};

export default function EstatisticasChart({ valor, chartData, variant }: EstatisticasChartProps) {
    return (
        <div className="grid w-full grid-cols-3 gap-2 max-lg:flex max-lg:flex-col max-lg:gap-3">
            <div className="flex items-center justify-center">
                <span className="text-5xl">{valor}</span>
            </div>
            <div className="col-span-2">
                <Chart variant={variant} data={chartData} />
            </div>
        </div>
    );
}