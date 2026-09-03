"use client"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts"

const chartData = [
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

export function Chart() {
    return (
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <LineChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />

                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                />
                <Line type="natural" dataKey="Pesquisas" fill="var(--color-Pesquisas)" radius={4} />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent />} />
            </LineChart>
        </ChartContainer>
    )
}
