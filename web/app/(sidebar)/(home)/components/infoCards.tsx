import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bolt } from "lucide-react";

type InfoCardProps = {
    cardTitle?: React.ReactNode;
    cardDescription?: React.ReactNode;
    cardAction?: React.ReactNode;
    cardContent?: React.ReactNode;
    isCardFooter?: boolean;
    cardFooter?: React.ReactNode;
    cardClassName?: React.ReactNode;
    animationDelayN?: number;
};

export default function InfoCard({
    cardTitle,
    cardDescription,
    cardAction,
    cardContent,
    isCardFooter = true,
    cardFooter,
    cardClassName,
    animationDelayN = 1,
}: InfoCardProps) {
    return (
        <>
            <Card
                style={{ animationDelay: `${animationDelayN * 150}ms` }}
                className={`${cardClassName} introduction-card relative bg-linear-to-br from-[#B66D56]/10 via-white/10 to-[#124B52]/10 shadow-md`}
            >
                <Bolt size={13} className="absolute top-2 right-2 opacity-15"></Bolt>
                <Bolt size={13} className="absolute top-2 left-2 opacity-15"></Bolt>
                <Bolt size={13} className="absolute bottom-2 right-2 opacity-15"></Bolt>
                <Bolt size={13} className="absolute bottom-2 left-2 opacity-15"></Bolt>

                <CardHeader>
                    <CardTitle className="text-xl">{cardTitle}</CardTitle>
                    <CardDescription>{cardDescription}</CardDescription>
                    <CardAction>{cardAction}</CardAction>
                </CardHeader>
                <CardContent>
                    {cardContent}
                </CardContent>
                {isCardFooter ?
                    <CardFooter>
                        <p>{cardFooter}</p>
                    </CardFooter> :
                    ""
                }

            </Card>
        </>
    );
}