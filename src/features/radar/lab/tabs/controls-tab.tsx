import { Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { HalfLifeSlider } from "@/components/half-life-control";
import { Toggle } from "../lab-shared";

export function ControlsTab({
  includeOnline, setIncludeOnline,
  includeRemoto, setIncludeRemoto,
  includeModelo, setIncludeModelo,
  houseOn, setHouseOn,
  useTrackRecord, setUseTrackRecord,
  useTrackHouse, setUseTrackHouse,
}: {
  includeOnline: boolean; setIncludeOnline: (v: boolean) => void;
  includeRemoto: boolean; setIncludeRemoto: (v: boolean) => void;
  includeModelo: boolean; setIncludeModelo: (v: boolean) => void;
  houseOn: boolean; setHouseOn: (v: boolean) => void;
  useTrackRecord: boolean; setUseTrackRecord: (v: boolean) => void;
  useTrackHouse: boolean; setUseTrackHouse: (v: boolean) => void;
}) {
  return (
        <TabsContent value="controls" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-4 text-primary" />
                Controles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <HalfLifeSlider id="lab-half-life" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle
                  checked={includeOnline}
                  onChange={setIncludeOnline}
                  label="Incluir online"
                />
                <Toggle
                  checked={includeRemoto}
                  onChange={setIncludeRemoto}
                  label="Incluir remoto"
                />
                <Toggle
                  checked={includeModelo}
                  onChange={setIncludeModelo}
                  label="Modelos pessoais"
                />
                <Toggle
                  checked={houseOn}
                  onChange={setHouseOn}
                  label="Ajuste por casa (fica desligado)"
                />
                <Toggle
                  checked={useTrackRecord}
                  onChange={setUseTrackRecord}
                  label="Peso por acerto 2014/2018/2022"
                />
                <Toggle
                  checked={useTrackHouse}
                  onChange={setUseTrackHouse}
                  label="Ajuste extra por casa (não usado)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

  );
}
