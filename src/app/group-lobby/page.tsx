import { Suspense } from "react";
import GroupLobbyClient from "./GroupLobbyClient";

export default function GroupLobbyPage() {
  return (
    <Suspense>
      <GroupLobbyClient />
    </Suspense>
  );
}
