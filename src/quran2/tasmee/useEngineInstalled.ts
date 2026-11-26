import * as React from "react";
import { engineInstalled, engineSupported } from "../tajweed/engine";

/** Whether the tajweed engine is on the device (null while it is looked for), and a way to look again. */
export function useEngineInstalled(): [boolean | null, () => void] {
  const [installed, setInstalled] = React.useState<boolean | null>(() => (engineSupported() ? null : false));
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    if (!engineSupported()) return;
    void engineInstalled().then((v) => alive && setInstalled(v));
    return () => {
      alive = false;
    };
  }, [version]);
  return [installed, () => setVersion((v) => v + 1)];
}
