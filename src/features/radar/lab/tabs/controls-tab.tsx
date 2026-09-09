import { Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { HalfLifeSlider } from "@/components/half-life-control";
import { Toggle } from "../lab-shared";
import { useI18n } from "@/lib/i18n";

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
  const { m } = useI18n();
  return (
        <TabsContent value="controls" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-4 text-primary" />
                {m.lab.controls}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <HalfLifeSlider id="lab-half-life" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle
                  checked={includeOnline}
                  onChange={setIncludeOnline}
                  label={m.lab.includeOnline}
                />
                <Toggle
                  checked={includeRemoto}
                  onChange={setIncludeRemoto}
                  label={m.lab.includeRemote}
                />
                <Toggle
                  checked={includeModelo}
                  onChange={setIncludeModelo}
                  label={m.lab.includeModel}
                />
                <Toggle
                  checked={houseOn}
                  onChange={setHouseOn}
                  label={m.lab.houseAdj}
                />
                <Toggle
                  checked={useTrackRecord}
                  onChange={setUseTrackRecord}
                  label={m.lab.trackOn}
                />
                <Toggle
                  checked={useTrackHouse}
                  onChange={setUseTrackHouse}
                  label={m.lab.houseExtra}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

  );
}
