import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type PopupData = {
  enabled: boolean;
  title: string;
  content: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
};

export function PopupModal() {
  const [dismissed, setDismissed] = useState(false);

  const { data: popup } = useQuery<PopupData>({
    queryKey: ["/api/settings/popup"],
    staleTime: 60000,
  });

  useEffect(() => {
    const lastDismissed = localStorage.getItem("popup_dismissed_at");
    if (lastDismissed) {
      const diff = Date.now() - parseInt(lastDismissed);
      if (diff < 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  if (!popup || !popup.enabled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("popup_dismissed_at", Date.now().toString());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" data-testid="popup-modal">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="absolute top-3 right-3 rounded-full bg-black/20 text-white z-10"
          data-testid="button-close-popup"
        >
          <X className="w-4 h-4" />
        </Button>

        {popup.imageUrl && (
          <img
            src={popup.imageUrl}
            alt=""
            className="w-full h-48 object-cover"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="p-6">
          {popup.title && (
            <h2 className="text-lg font-bold text-foreground mb-2" data-testid="text-popup-title">{popup.title}</h2>
          )}
          {popup.content && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line" data-testid="text-popup-content">{popup.content}</p>
          )}
          <div className="flex gap-2">
            {popup.buttonText && popup.buttonUrl && (
              <a href={popup.buttonUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full rounded-xl" data-testid="button-popup-action">
                  {popup.buttonText}
                </Button>
              </a>
            )}
            <Button variant="outline" className="rounded-xl" onClick={handleDismiss} data-testid="button-popup-dismiss">
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
