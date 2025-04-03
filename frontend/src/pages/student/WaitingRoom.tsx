"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePoll } from "@/contexts/PollContext";
import { Loader2 } from "lucide-react";

export default function WaitingRoom() {
  const navigate = useNavigate();
  const { username, pollRoom, socket } = usePoll();

  useEffect(() => {
    if (!username || !pollRoom) {
      navigate("/student/username");
      return;
    }
    const handleQuestionActivated = (data: {
      id: string;
      text: string;
      timer: number;
    }) => {
      console.log("Question activated:", data);
      navigate("/student/answer");
    };

    socket?.on("question-activated", handleQuestionActivated);

    return () => {
      socket?.off("question-activated", handleQuestionActivated);
    };
  }, [username, pollRoom, navigate, socket]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4 text-center">
        <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mb-4">
          Intervue Poll
        </div>

        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Wait for the teacher to ask questions...
          </h1>
          <p className="text-gray-500">
            You've successfully joined the poll. The question will appear here
            when the teacher starts the poll.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          Room Code: <span className="font-bold">{pollRoom?.code}</span>
        </div>
      </div>
    </div>
  );
}
