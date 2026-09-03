import { Bolt } from "lucide-react";

type bannerProps = {
    title?: React.ReactNode;
};

export default function BannerComponent({ title }: bannerProps) {
    return (
        <>
            <div className="relative h-50 rounded-2xl overflow-hidden flex justify-center items-center shadow-lg min-h-60 max-sm:min-h-30">
                <div
                    className="absolute -inset-2 bg-cover bg-center bg-no-repeat blur-xs"
                    style={{
                        backgroundImage: "url('/backgroundGreen.jpeg')",
                        backgroundSize: "110%",
                    }}
                />

                <span className="relative z-10 text-white text-3xl">
                    {title}
                </span>
                <Bolt size={13} color="white" className="absolute top-2 right-2 opacity-15"></Bolt>
                <Bolt size={13} color="white" className="absolute top-2 left-2 opacity-15"></Bolt>
                <Bolt size={13} color="white" className="absolute bottom-2 right-2 opacity-15"></Bolt>
                <Bolt size={13} color="white" className="absolute bottom-2 left-2 opacity-15"></Bolt>
            </div>
        </>
    )
}