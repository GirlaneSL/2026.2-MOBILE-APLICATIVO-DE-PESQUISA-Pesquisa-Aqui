"use client"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts"

const defaultChartData = [
    { month: "January", Pesquisas: 186, },
    { month: "February", Pesquisas: 305, },
    { month: "March", Pesquisas: 237, },
]

const chartConfig = {
    Pesquisas: {
        label: "Pesquisas",
        color: "#447762",
    },
} satisfies ChartConfig

type ChartProps = {
    variant?: "line" | 'bar';
    data?: { month: string; Pesquisas: number }[];
};

export function Chart({ variant, data = defaultChartData }: ChartProps) {
    return (
        <ChartContainer config={chartConfig} className="max-h-175 max-w-175 w-full">

            {variant === 'line' ? (
                <LineChart accessibilityLayer data={data}>
                    <CartesianGrid vertical={false} />

                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <Line
                        type="natural"
                        dataKey="Pesquisas"
                        stroke="var(--color-Pesquisas)"
                        strokeWidth={2}
                        dot={{ fill: "var(--color-Pesquisas)" }}
                        activeDot={{ r: 6 }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                </LineChart>
            ) : (
                <BarChart accessibilityLayer data={data}>
                    <CartesianGrid vertical={false} />

                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <Bar type="natural" dataKey="Pesquisas" fill="var(--color-Pesquisas)" radius={4} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
            )}

        </ChartContainer>
    )
}