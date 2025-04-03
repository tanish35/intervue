import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePoll } from "@/contexts/PollContext";
import { Clock } from "lucide-react";

export default function AnswerPoll() {
  const navigate = useNavigate();
  const { pollRoom, submitAnswer, socket } = usePoll();
  const [selectedOption, setSelectedOption] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const activeQuestion = pollRoom?.questions.find((q) => q.status === "ACTIVE");

  // Fetch server time on component mount
  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const response = await axios.get(`/api/poll/${pollRoom?.code}/time`);
        setTimeLeft(response.data.remaining);
      } catch (error) {
        console.error("Error fetching server time:", error);
        // Fallback to local timer if server fails
        if (activeQuestion) setTimeLeft(activeQuestion.timer);
      }
    };

    if (pollRoom?.code && activeQuestion) {
      fetchServerTime();
    }
    if (pollRoom?.code) {
      socket?.emit("join-poll", pollRoom.code);
    }
  }, [pollRoom?.code]); // Run only on initial mount

  useEffect(() => {
    if (!sessionStorage.getItem("authToken")) {
      navigate("/student/username");
      return;
    }

    if (activeQuestion && timeLeft === 0) {
      setTimeLeft(activeQuestion.timer);
    }
  }, [activeQuestion, navigate]);

  useEffect(() => {
    if (!activeQuestion) return;

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleQuestionResults = () => {
      navigate("/student/waiting");
    };

    socket?.on("question-results", handleQuestionResults);

    return () => {
      clearInterval(timerInterval);
      socket?.off("question-results", handleQuestionResults);
    };
  }, [activeQuestion, socket, navigate]);

  const handleSubmit = async () => {
    if (selectedOption && activeQuestion) {
      try {
        await submitAnswer(activeQuestion.id, selectedOption);
        setSubmitted(true);
      } catch (error) {
        console.error("Failed to submit answer:", error);
      }
    }
  };

  if (!activeQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Waiting for next question...</div>
          <Button onClick={() => navigate("/student/waiting")}>
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mb-2">
            Intervue Poll
          </div>
          <div className="flex items-center justify-center mb-2">
            <h2 className="text-lg font-bold mr-2">Live Question</h2>
            <div className="flex items-center text-sm text-red-500">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-medium mb-4">{activeQuestion.text}</h3>

          {submitted ? (
            <div className="text-center py-8">
              <div className="text-green-500 font-medium mb-2">
                Answer submitted!
              </div>
              <p className="text-gray-500 text-sm">Waiting for results...</p>
            </div>
          ) : (
            <>
              <RadioGroup
                value={selectedOption}
                onValueChange={setSelectedOption}
                className="space-y-3"
              >
                {activeQuestion.options.map((option) => (
                  <div
                    key={option.id}
                    className="border rounded-md p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedOption(option.id)} // Add this
                  >
                    <RadioGroupItem
                      value={option.id}
                      id={option.id}
                      className="peer sr-only" // Modified
                    />
                    <Label
                      htmlFor={option.id}
                      className="flex items-center cursor-pointer font-medium peer-data-[state=checked]:text-purple-600 peer-data-[state=checked]:font-bold" // Modified
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <Button
                onClick={handleSubmit}
                className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
                disabled={!selectedOption || timeLeft === 0}
              >
                {timeLeft > 0 ? "Submit Answer" : "Time's Up!"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
