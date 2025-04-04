import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Clock, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePoll } from "@/contexts/PollContext";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { username, pollRoom, createQuestion, activateQuestion } = usePoll();

  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [timer, setTimer] = useState("60");
  const [activeTab, setActiveTab] = useState("question");

  useEffect(() => {
    if (!sessionStorage.getItem("authToken")) {
      navigate("/teacher/username");
    }
    console.log("Poll Room:", pollRoom);
  }, [username, pollRoom, navigate]);

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreateQuestion = async () => {
    if (questionText && options.filter((opt) => opt.trim()).length >= 2) {
      
      await createQuestion(
        questionText,
        options.filter((opt) => opt.trim()),
        Number.parseInt(timer)
      );
      setQuestionText("");
      setOptions(["", ""]);
      setTimer("60");
      setActiveTab("question"); 
    }
  };

  const handleStartQuestion = async (questionId: string) => {
    await activateQuestion(questionId);
  };

  if (!pollRoom) {
    return <div>Loading poll room...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mb-1">
              Intervue Poll
            </div>
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
              Room Code: <span className="font-bold">{pollRoom.code}</span>
            </div>
            <Link to="/teacher/history">
              <Button variant="outline" size="sm">
                View History
              </Button>
            </Link>
          </div>
        </div>

        <Tabs
          defaultValue="question"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="question">Questions</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          {}
          <TabsContent value="question">
            {pollRoom.activeQuestion ? (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-lg font-bold mb-4">
                    {pollRoom.activeQuestion.text}
                  </h2>
                  <RadioGroup className="space-y-2">
                    {pollRoom.activeQuestion.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-2 border rounded-md p-3 bg-purple-100"
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id}>{option.text}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="mt-4 flex justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{pollRoom.activeQuestion.timer} seconds</span>
                    </div>
                    {}
                    {}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {}
                    <Input
                      id="question"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Type your question here"
                    />
                    {}
                    {options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="mb-2"
                      />
                    ))}
                    {}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="bg-white text-purple-600 border-purple-600 hover:bg-purple-100"
                    >
                      Add More Option
                    </Button>

                    {}
                    <Select value={timer} onValueChange={setTimer}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select timer duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {[30, 60, 90].map((time) => (
                          <SelectItem key={time} value={`${time}`}>
                            {time} seconds
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {}
                    <Button
                      onClick={handleCreateQuestion}
                      disabled={
                        !questionText ||
                        options.filter((opt) => opt.trim()).length < 2
                      }
                      className="bg-purple-600 text-white hover:bg-purple-700"
                    >
                      Create Question
                    </Button>

                    {}
                    {pollRoom.questions.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleStartQuestion(
                            pollRoom.questions[pollRoom.questions.length - 1].id
                          )
                        }
                        className="bg-white text-purple-600 border-purple-600 hover:bg-purple-100"
                      >
                        Ask Question
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {}
          <TabsContent value="participants">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-medium">Participants</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{pollRoom.participants.length} joined</span>
                  </div>
                </div>
                {pollRoom.participants.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No participants have joined yet.
                  </p>
                ) : (
                  pollRoom.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex justify-between items-center p-2 border-b"
                    >
                      <span>{participant.username}</span>
                      {}
                      {}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
