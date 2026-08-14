import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface Block {
  subject: string;
  hours: number;
  focus: string;
}

interface DaySchedule {
  date: string;
  blocks: Block[];
}

export default function StudyPlanView() {
  const { planId } = useParams<{ planId: string }>();
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);

  useEffect(() => {
    api.get(`/study-plans/${planId}`).then(({ data }) => setSchedule(data.schedule || []));
  }, [planId]);

  return (
    <div>
      <h1 className="text-xl font-medium">Your study plan</h1>

      <div className="mt-6 flex flex-col gap-4">
        {schedule.map((day) => (
          <div key={day.date} className="rounded-lg border border-paper-300 p-4">
            <p className="font-medium">{day.date}</p>
            <div className="mt-2 flex flex-col gap-1">
              {day.blocks.map((b, i) => (
                <p key={i} className="text-sm text-ink-700">
                  <span className="font-medium">{b.subject}</span> — {b.hours}h: {b.focus}
                </p>
              ))}
            </div>
          </div>
        ))}
        {schedule.length === 0 && <p className="text-sm text-ink-500">Loading...</p>}
      </div>
    </div>
  );
}
