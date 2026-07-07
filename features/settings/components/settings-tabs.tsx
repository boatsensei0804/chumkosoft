"use client";

import { useState } from "react";
import Icon from "@/features/dashboard/components/icon";
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
          { value: "academic", label: "ปีการศึกษาและภาคเรียน", icon: <Icon name="calendar" sx={{ fontSize: 17 }} /> },
          { value: "periods", label: "คาบเรียน", icon: <Icon name="time" sx={{ fontSize: 17 }} /> },
        ]}
      />

      {tab === "academic" ? <AcademicSettings years={years} /> : <PeriodSettings initialPeriods={periods} />}
    </div>
  );
}
