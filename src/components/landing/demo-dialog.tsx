import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SITE } from "@/data/site";

const Ctx = createContext<() => void>(() => {});
export const useDemo = () => useContext(Ctx);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openDemo = () => {
    if (SITE.demoUrl) window.open(SITE.demoUrl, "_blank", "noopener");
    else setOpen(true);
  };
  return (
    <Ctx.Provider value={openDemo}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-line bg-popover">
          <DialogHeader>
            <p className="eyebrow text-accent">Request a demo</p>
            <DialogTitle className="font-display text-3xl">Demo requests are not connected yet.</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              A booking form or contact address hasn't been configured for this site. Once the Ziphyrus X team supplies
              one, this button will take you straight there.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
