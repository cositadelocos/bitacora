import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { EditorApp } from "@/components/editor/editor-app";

export const Route = createFileRoute("/editar")({
  component: EditorPage,
});

function EditorPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="desk-screen center-note">
        <p className="quiet-note">Abriendo el estudio…</p>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <EditorApp />;
}
