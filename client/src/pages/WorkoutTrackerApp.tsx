import { CalendarIcon, DumbbellIcon, MoreVerticalIcon } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const workoutData = {
  week: {
    number: "Week 1",
    phase: "Foundation",
    dateRange: "Oct 19 - Oct 25",
    completion: "0/2",
    description: "Easing back in - should feel manageable, not exhausting",
  },
  workouts: [
    {
      title: "Lower Heavy",
      day: "Sunday • Oct 19",
      exercises: "2 exercises",
      duration: "Total time: ~60 mins",
      status: null,
    },
    {
      title: "Upper + Cardio",
      day: "Tuesday • Oct 21",
      exercises: "1 exercises",
      cardio: "35 min cardio",
      duration: "Total time: ~90 mins including cardio",
      status: "Upcoming",
    },
  ],
};

export const WorkoutTrackerApp = (): JSX.Element => {
  return (
    <div className="bg-white w-full min-w-[393px] min-h-[852px] relative">
      <header className="flex flex-col w-full items-start pt-4 pb-[0.55px] px-4 bg-[#fffffff2] border-b-[0.55px] border-solid border-[#0000001a]">
        <div className="flex h-9 items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <DumbbellIcon className="w-8 h-8" />
            <h1 className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6 whitespace-nowrap">
              Workout Program
            </h1>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVerticalIcon className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <main className="flex flex-col w-full items-start pt-[23.54px] px-4">
        <Card className="w-full bg-white rounded-[14px] border-[0.55px] border-solid border-[#0000001a]">
          <CardContent className="p-0">
            <div className="flex flex-col w-full bg-[#ececf080] pt-4 pb-0 px-4 gap-[7.99px]">
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col items-start gap-[3.99px]">
                  <div className="flex items-center gap-[7.99px]">
                    <span className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6">
                      {workoutData.week.number}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-[21.08px] px-2 py-0.5 rounded-lg border-[0.55px] border-solid border-[#0000001a]"
                    >
                      <span className="[font-family:'Inter',Helvetica] font-medium text-neutral-950 text-xs tracking-[0] leading-4">
                        {workoutData.week.phase}
                      </span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5">
                      {workoutData.week.dateRange}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="h-[21.08px] px-2 py-0.5 bg-[#eceef2] rounded-lg border-[0.55px] border-solid border-transparent"
                >
                  <span className="[font-family:'Inter',Helvetica] font-medium text-[#030213] text-xs tracking-[0] leading-4">
                    {workoutData.week.completion}
                  </span>
                </Badge>
              </div>
              <p className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5 pb-4">
                {workoutData.week.description}
              </p>
            </div>

            <div className="flex flex-col">
              {workoutData.workouts.map((workout, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between pt-4 pb-[0.55px] px-4 border-b-[0.55px] border-solid border-[#0000001a]"
                >
                  <div className="flex flex-col items-start gap-[3.99px] flex-1">
                    <div className="flex items-center gap-[7.99px]">
                      <h3 className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6">
                        {workout.title}
                      </h3>
                      {workout.status && (
                        <Badge
                          variant="outline"
                          className="h-[21.08px] px-2 py-0.5 rounded-lg border-[0.55px] border-solid border-[#0000001a]"
                        >
                          <span className="[font-family:'Inter',Helvetica] font-medium text-neutral-950 text-xs tracking-[0] leading-4">
                            {workout.status}
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5">
                      {workout.day}
                    </p>
                    <div className="flex flex-col gap-0">
                      <div className="flex items-center gap-2">
                        <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-xs tracking-[0] leading-4">
                          {workout.exercises}
                        </span>
                        {workout.cardio && (
                          <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-xs tracking-[0] leading-4">
                            • {workout.cardio}
                          </span>
                        )}
                      </div>
                      <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-xs tracking-[0] leading-4">
                        • {workout.duration}
                      </span>
                    </div>
                  </div>
                  <Button className="h-9 px-4 py-2 bg-[#030213] rounded-lg">
                    <span className="[font-family:'Inter',Helvetica] font-medium text-white text-sm tracking-[-0.15px] leading-5">
                      Start
                    </span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
