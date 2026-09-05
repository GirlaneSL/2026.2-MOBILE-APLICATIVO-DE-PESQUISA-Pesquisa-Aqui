import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

export default function UltimasAtualizacoesList() {
    return (
        <div className="flex flex-col gap-2 overflow-y-auto h-55">
            <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                <Activity className="shrink-0" />
                <span className="truncate">
                    aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                </span>
            </Skeleton>
            <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                <Activity className="shrink-0" />
                <span className="truncate">
                    aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                </span>
            </Skeleton>
            <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                <Activity className="shrink-0" />
                <span className="truncate">
                    aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                </span>
            </Skeleton>
            <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                <Activity className="shrink-0" />
                <span className="truncate">
                    aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                </span>
            </Skeleton>
            <Skeleton className="w-full h-10 flex items-center gap-2 px-3 min-h-10">
                <Activity className="shrink-0" />
                <span className="truncate">
                    aaaaaaaa asd asda sd asd asd merda asojdjalosjdjn asokda oskdja oksjdoajksjdoakjn
                </span>
            </Skeleton>
        </div>
    );
}