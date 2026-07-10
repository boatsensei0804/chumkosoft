"use client";

import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { Segmented } from "./controls";
import AcademicSettings from "./academic-settings";
import PeriodSettings from "./period-settings";
import type { AcademicYearSetting, PeriodSetting } from "../types";

type Tab = "academic" | "periods";

interface SettingsTabsProps {
  years: AcademicYearSetting[];
  periods: PeriodSetting[];
}

export default function SettingsTabs({ years, periods }: SettingsTabsProps): React.ReactNode {
  const [tab, setTab] = useState<Tab>("academic");

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={[
          { value: "academic", label: "ปีการศึกษาและภาคเรียน", icon: <CalendarDays className="size-[17px]" /> },
          { value: "periods", label: "คาบเรียน", icon: <Clock className="size-[17px]" /> },
        ]}
      />

      {tab === "academic" ? <AcademicSettings years={years} /> : <PeriodSettings initialPeriods={periods} />}
    </div>
  );
}
