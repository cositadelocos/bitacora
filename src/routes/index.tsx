import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getPublished, getRole } from "@/lib/logbook/api";
import { BookStage } from "@/components/book/book-stage";

export const Route = createFileRoute("/")({
  loader: () => getPublished(),
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (isPending || !user) {
      setCanEdit(false);
      return;
    }
    let cancel = false;
    void getRole()
      .then((role) => {
        if (!cancel) setCanEdit(role.canEdit);
      })
      .catch(() => {
        if (!cancel) setCanEdit(false);
      });
    return () => {
      cancel = true;
    };
  }, [user, isPending]);

  return <BookStage doc={data.doc} assetMode="public" canEdit={!isPending && !!user && canEdit} />;
}
