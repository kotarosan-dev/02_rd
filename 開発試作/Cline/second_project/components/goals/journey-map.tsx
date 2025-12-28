import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

interface Phase {
  name: string;
  description: string;
  duration: string;
  milestones: string[];
}

interface JourneyMapProps {
  phases: Phase[];
  totalDuration: string;
  expectedOutcome: string;
  currentPhase?: number;
}

export function JourneyMap({ 
  phases, 
  totalDuration, 
  expectedOutcome,
  currentPhase = 0 
}: JourneyMapProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">ジャーニーマップ</h3>
        <span className="text-sm text-muted-foreground">
          予定期間: {totalDuration}
        </span>
      </div>

      <div className="relative mt-8">
        {/* フェーズポイントとカード */}
        <div className="flex items-center">
          {phases.map((phase, index) => {
            const isPast = index < currentPhase;
            const isCurrent = index === currentPhase;
            const isFuture = index > currentPhase;
            const isLast = index === phases.length - 1;

            return (
              <div key={index} className="flex-1 flex items-center">
                <div className="flex-1 flex flex-col items-center">
                  {/* ポイント */}
                  <div className="relative z-10 bg-background rounded-full p-1">
                    {isPast && (
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                    )}
                    {isCurrent && (
                      <div className="w-8 h-8 rounded-full bg-primary animate-pulse" />
                    )}
                    {isFuture && (
                      <Circle className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* フェーズ情報カード */}
                  <Card className={`
                    mt-4 p-4 w-[200px] relative z-10
                    ${isPast ? 'opacity-75' : ''}
                    ${isCurrent ? 'border-primary shadow-lg' : ''}
                    ${isFuture ? 'opacity-50' : ''}
                  `}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-primary">{phase.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {phase.duration}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {phase.description}
                      </p>
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium">マイルストーン:</h5>
                        <ul className="ml-4 list-disc text-xs text-muted-foreground">
                          {phase.milestones.map((milestone, i) => (
                            <li key={i}>{milestone}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
                {/* 点線の接続（最後のフェーズ以外に表示） */}
                {!isLast && (
                  <div className="w-full h-0.5 border-t-2 border-dashed border-primary/20 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Card className="p-4 bg-primary/5 mt-8">
        <h4 className="font-medium mb-2">期待される成果</h4>
        <p className="text-sm text-muted-foreground">{expectedOutcome}</p>
      </Card>
    </div>
  );
} 