"use client";

import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePoll } from "@/contexts/PollContext";
import { ArrowLeft } from "lucide-react";

export default function PollHistory() {
  const navigate = useNavigate();
  const { username, pollRoom } = usePoll();

  useEffect(() => {
    if (!username || !pollRoom) {
      navigate("/teacher/username");
    }
  }, [username, pollRoom, navigate]);

  if (!pollRoom) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to="/teacher/dashboard">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">View Poll History</h1>
        </div>

        <div className="space-y-8">
          {pollRoom.history.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No poll history available yet</p>
              </CardContent>
            </Card>
          ) : (
            pollRoom.history.map((question, questionIndex) => (
              <div key={question.id} className="space-y-2">
                <h2 className="text-lg font-medium">
                  Question {questionIndex + 1}
                </h2>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-4">{question.text}</h3>
                    <div className="space-y-3">
                      {question.options.map((option) => {
                        const result = question.results?.[option.id as any];
                        const percentage =
                          typeof result === "number"
                            ? result
                            : result?.percentage || 0;
                        return (
                          <div key={option.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{option.text}</span>
                              <span>{percentage}%</span>
                            </div>
                            <div className="h-6 w-full bg-gray-100 rounded-md overflow-hidden">
                              <div
                                className="h-full bg-purple-600 rounded-md"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
