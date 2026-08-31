import { MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { BrazilMap, MapLayerToggle, type MapLayer } from "@/features/radar/map/brazil-map";
import type { EngineConfig } from "@/lib/forecast/engine";

export function MapTab({
  mapLayer,
  setMapLayer,
  config,
}: {
  mapLayer: MapLayer;
  setMapLayer: (layer: MapLayer) => void;
  config: EngineConfig;
}) {
  return (
        <TabsContent value="mapa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Mapa agregador
              </CardTitle>
              <CardDescription>
                2026 agregado: pesquisas por UF. 2022 urna: como cada colégio
                (UF) votou em Lula e Bolsonaro. Cor do modo 2022 = margem do 2º.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <MapLayerToggle layer={mapLayer} onChange={setMapLayer} />
              <BrazilMap config={config} layer={mapLayer} />
            </CardContent>
          </Card>
        </TabsContent>

  );
}
