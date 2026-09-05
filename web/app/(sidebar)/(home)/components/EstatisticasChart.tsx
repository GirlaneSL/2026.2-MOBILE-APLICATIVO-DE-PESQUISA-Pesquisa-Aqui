import { Chart } from "./grafico";

export default function EstatisticasChart({ valor }: { valor: string | number }) {
    return (
        <div className="grid w-full grid-cols-3 gap-2 max-lg:flex max-lg:flex-col max-lg:gap-3">
            <div className="flex items-center justify-center">
                <span className="text-5xl">{valor}</span>
            </div>
            <div className="col-span-2">
                <Chart />
            </div>
        </div>
    );
}