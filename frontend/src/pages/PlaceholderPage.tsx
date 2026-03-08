import AppHeader from "@/components/AppHeader";

export default function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <AppHeader title={title} subtitle={subtitle} />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-heading font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">This module is ready for implementation. Connect to Lovable Cloud to enable full functionality.</p>
        </div>
      </div>
    </>
  );
}
