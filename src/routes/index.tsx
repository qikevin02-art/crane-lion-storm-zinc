import { createFileRoute } from "@tanstack/react-router";
import { StarGame } from "@/components/star-game";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <StarGame />;
}
