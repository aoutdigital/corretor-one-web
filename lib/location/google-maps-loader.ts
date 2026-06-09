type GoogleLatLngLiteral = { lat: number; lng: number };
type GoogleLatLngLike = GoogleLatLngLiteral | { lat: () => number; lng: () => number };

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (
          element: Element,
          options: Record<string, unknown>,
        ) => {
          fitBounds: (
            bounds: { extend: (position: GoogleLatLngLiteral) => void },
            padding?: number | Record<string, number>,
          ) => void;
          setCenter: (latLng: GoogleLatLngLiteral) => void;
          setZoom: (zoom: number) => void;
        };
        Marker: new (options: Record<string, unknown>) => {
          setMap?: (map: unknown | null) => void;
          setPosition: (position: GoogleLatLngLiteral) => void;
          addListener: (eventName: string, handler: () => void) => void;
          getPosition: () => { lat: () => number; lng: () => number } | null;
        };
        LatLngBounds: new () => {
          extend: (position: GoogleLatLngLiteral) => void;
        };
        InfoWindow: new (options?: { content?: string | Element; maxWidth?: number }) => {
          close: () => void;
          setContent: (content: string | Element) => void;
          open: (options: { anchor?: unknown; map?: unknown }) => void;
        };
        event: {
          addListener: (
            instance: unknown,
            eventName: string,
            handler: () => void,
          ) => { remove: () => void };
        };
        importLibrary?: (libraryName: string) => Promise<unknown>;
        marker?: {
          AdvancedMarkerElement?: new (options: {
            map: unknown;
            position: GoogleLatLngLiteral;
            gmpDraggable?: boolean;
            title?: string;
          }) => {
            map?: unknown;
            position?: GoogleLatLngLike | null;
            setMap?: (map: unknown | null) => void;
            addListener?: (eventName: string, handler: () => void) => void;
          };
        };
      };
    };
    __coMapsPromise?: Promise<void>;
  }
}

export function loadGoogleMapsScript(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps && typeof window.google.maps.Map === "function") {
    return Promise.resolve();
  }
  if (window.__coMapsPromise) return window.__coMapsPromise;

  const waitForMapCtor = () =>
    new Promise<void>((resolve, reject) => {
      const timeoutAt = Date.now() + 8000;
      const tick = () => {
        if (window.google?.maps && typeof window.google.maps.Map === "function") {
          resolve();
          return;
        }
        if (Date.now() > timeoutAt) {
          reject(new Error("Google Maps não disponibilizou Map a tempo."));
          return;
        }
        window.setTimeout(tick, 80);
      };
      tick();
    });

  window.__coMapsPromise = new Promise<void>((resolve, reject) => {
    const ensureLibraries = async () => {
      if (!window.google?.maps) throw new Error("Google Maps não carregou.");
      if (typeof window.google.maps.importLibrary === "function") {
        await window.google.maps.importLibrary("maps");
        try {
          await window.google.maps.importLibrary("marker");
        } catch {
          // Não bloqueia inicialização do mapa se marker avançado falhar.
        }
      }
      await waitForMapCtor();
    };

    const existing = document.querySelector(
      'script[data-co-google-maps="1"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      if (window.google?.maps) {
        void ensureLibraries()
          .then(() => resolve())
          .catch((error) =>
            reject(error instanceof Error ? error : new Error("Falha ao carregar Google Maps")),
          );
        return;
      }

      existing.addEventListener(
        "load",
        () => {
          void ensureLibraries()
            .then(() => resolve())
            .catch((error) =>
              reject(error instanceof Error ? error : new Error("Falha ao carregar Google Maps")),
            );
        },
        { once: true },
      );
      existing.addEventListener(
        "error",
        () => reject(new Error("Falha ao carregar Google Maps")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key,
    )}&language=pt-BR&region=BR&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-co-google-maps", "1");
    script.onload = () => {
      void ensureLibraries()
        .then(() => resolve())
        .catch((error) =>
          reject(error instanceof Error ? error : new Error("Falha ao carregar Google Maps")),
        );
    };
    script.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(script);
  });

  window.__coMapsPromise = window.__coMapsPromise.catch((error) => {
    window.__coMapsPromise = undefined;
    throw error;
  });

  return window.__coMapsPromise;
}
