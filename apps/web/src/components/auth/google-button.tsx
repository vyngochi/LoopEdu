"use client";

import Script from "next/script";
import { useRef } from "react";

type Gis = {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Nút "Tiếp tục với Google" do Google Identity Services vẽ (đúng quy định thương hiệu của Google).
 * Trả ID token qua `onCredential`; API tự xác minh. Không có client ID thì không hiện nút.
 */
export function GoogleButton({ onCredential, theme }: { onCredential: (idToken: string) => void; theme: "filled_black" | "outline" }) {
  const box = useRef<HTMLDivElement>(null);
  if (!CLIENT_ID) return null;

  const render = () => {
    const gis = (window as unknown as { google?: Gis }).google;
    if (!gis || !box.current) return;
    gis.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => onCredential(r.credential) });
    // GIS chỉ nhận chiều rộng 200–400 px.
    const width = Math.min(400, Math.max(200, Math.floor(box.current.clientWidth)));
    gis.accounts.id.renderButton(box.current, { type: "standard", theme, shape: "pill", size: "large", text: "continue_with", locale: "vi", width });
  };

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={render} />
      <div ref={box} className="flex min-h-10 justify-center" />
    </>
  );
}
