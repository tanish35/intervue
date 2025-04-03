import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePoll } from "@/contexts/PollContext";

export default function RoleSelection() {
  const navigate = useNavigate();
  const { setRole } = usePoll();

  const handleRoleSelect = (selectedRole: "teacher" | "student") => {
    setRole(selectedRole);
    navigate(
      selectedRole === "teacher" ? "/teacher/username" : "/student/username"
    );
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-50">
      <div className="w-screen max-w-none px-8">
        <div className="text-center mb-8">
          <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mb-2">
            Intervue Poll
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Welcome to the Live Polling System
          </h1>
          <p className="text-gray-500 text-sm">
            Please select the role that best describes you to begin using the
            live polling system
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card
            className="cursor-pointer border-2 hover:border-purple-500 transition-all"
            onClick={() => handleRoleSelect("student")}
          >
            <CardContent className="p-4">
              <h2 className="font-semibold mb-1">I'm a Student</h2>
              <p className="text-xs text-gray-500">
                Submit answers and view live poll results in real-time.
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 hover:border-purple-500 transition-all"
            onClick={() => handleRoleSelect("teacher")}
          >
            <CardContent className="p-4">
              <h2 className="font-semibold mb-1">I'm a Teacher</h2>
              <p className="text-xs text-gray-500">
                Submit answers and view live poll results in real-time.
              </p>
            </CardContent>
          </Card>
        </div>

        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={() => handleRoleSelect("teacher")}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
