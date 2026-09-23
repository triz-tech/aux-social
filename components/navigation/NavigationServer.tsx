import AppNavigation from "@/components/navigation/AppNavigation";
import { getViewer } from "@/lib/auth/viewer";

export default async function NavigationServer() {
  const viewer = await getViewer();

  return (
    <AppNavigation
      signedIn={viewer.signedIn}
      viewerId={viewer.id}
      username={viewer.username}
    />
  );
}