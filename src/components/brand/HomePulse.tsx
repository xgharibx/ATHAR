import { Lottie } from "lottie-react";
import pulse from "@/assets/noor-pulse.json";

export default function HomePulse() {
  return <Lottie src={pulse} className="h-full w-full" autoplay loop />;
}
